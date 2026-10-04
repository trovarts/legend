package it.trovarts.agente

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.Display
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.io.ByteArrayOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.roundToInt

/** Una foto dello schermo, già rimpicciolita, più gli elementi toccabili. */
class Schermata(val jpegBase64: String, val elenco: String)

/**
 * Gli occhi e le mani dell'agente: fa le foto allo schermo, legge gli elementi,
 * tocca, trascina, scrive. Tutto quello che chiama l'Agente gira su un thread
 * suo, quindi qui si aspetta in modo bloccante che i gesti finiscano.
 */
class AgentService : AccessibilityService() {

    companion object {
        @Volatile var istanza: AgentService? = null
        private const val LATO_MAX = 1280
    }

    private val main = Handler(Looper.getMainLooper())

    /** Rapporto foto/schermo reale: le coordinate del modello sono in pixel della foto. */
    @Volatile private var scala = 1f
    private val elementi = mutableMapOf<Int, AccessibilityNodeInfo>()
    private val centri = mutableMapOf<Int, Pair<Int, Int>>()

    private var pannello: LinearLayout? = null
    private var stato: TextView? = null

    override fun onServiceConnected() {
        istanza = this
        main.post { creaPannello() }
    }

    override fun onDestroy() {
        istanza = null
        Agente.ferma()
        rimuoviPannello()
        super.onDestroy()
    }

    override fun onUnbind(intent: Intent?): Boolean {
        istanza = null
        rimuoviPannello()
        return super.onUnbind(intent)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    // ---------- Pannellino in sovrimpressione: stato + Stop ----------

    private fun creaPannello() {
        if (pannello != null) return
        val wm = getSystemService(WINDOW_SERVICE) as WindowManager
        val dp = resources.displayMetrics.density
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding((12 * dp).toInt(), (6 * dp).toInt(), (6 * dp).toInt(), (6 * dp).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 24 * dp
                setColor(Color.argb(230, 20, 20, 20))
            }
            visibility = View.GONE
            setOnClickListener {
                startActivity(Intent(this@AgentService, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }
        }
        val testo = TextView(this).apply {
            setTextColor(Color.WHITE)
            textSize = 13f
            maxWidth = (240 * dp).toInt()
            maxLines = 2
        }
        val stop = Button(this).apply {
            text = "Stop"
            textSize = 12f
            setOnClickListener { Agente.ferma() }
        }
        box.addView(testo)
        box.addView(stop)
        val lp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.START
            x = (8 * dp).toInt()
            y = (90 * dp).toInt()
        }
        wm.addView(box, lp)
        pannello = box
        stato = testo
    }

    private fun rimuoviPannello() {
        val p = pannello ?: return
        main.post {
            runCatching { (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(p) }
        }
        pannello = null
    }

    /** Mostra il pannello con un testo, o lo nasconde con null. */
    fun mostraStato(testo: String?) = main.post {
        stato?.text = testo ?: ""
        pannello?.visibility = if (testo == null) View.GONE else View.VISIBLE
    }

    private fun suMain(blocco: () -> Unit) {
        val l = CountDownLatch(1)
        main.post { blocco(); l.countDown() }
        l.await(2, TimeUnit.SECONDS)
    }

    // ---------- Occhi ----------

    /** Foto dello schermo (senza il pannello) + elenco degli elementi visibili. */
    fun guarda(): Schermata {
        val eraVisibile = pannello?.visibility == View.VISIBLE
        if (eraVisibile) {
            suMain { pannello?.visibility = View.INVISIBLE }
            Thread.sleep(120)
        }
        try {
            val foto = fotografa()
            return Schermata(foto, leggiElementi())
        } finally {
            if (eraVisibile) main.post { pannello?.visibility = View.VISIBLE }
        }
    }

    private fun fotografa(): String {
        var risultato: Bitmap? = null
        var errore: Int? = null
        // takeScreenshot ha un limite di frequenza: ritenta un paio di volte.
        for (tentativo in 0 until 3) {
            val l = CountDownLatch(1)
            takeScreenshot(Display.DEFAULT_DISPLAY, mainExecutor, object : TakeScreenshotCallback {
                override fun onSuccess(s: ScreenshotResult) {
                    val hw = Bitmap.wrapHardwareBuffer(s.hardwareBuffer, s.colorSpace)
                    risultato = hw?.copy(Bitmap.Config.ARGB_8888, false)
                    hw?.recycle()
                    s.hardwareBuffer.close()
                    l.countDown()
                }
                override fun onFailure(codice: Int) {
                    errore = codice
                    l.countDown()
                }
            })
            l.await(5, TimeUnit.SECONDS)
            if (risultato != null) break
            Thread.sleep(700)
        }
        val bmp = risultato ?: error("foto dello schermo non riuscita (codice $errore)")
        scala = minOf(1f, LATO_MAX.toFloat() / max(bmp.width, bmp.height))
        val piccola = Bitmap.createScaledBitmap(
            bmp, (bmp.width * scala).roundToInt(), (bmp.height * scala).roundToInt(), true)
        val out = ByteArrayOutputStream()
        piccola.compress(Bitmap.CompressFormat.JPEG, 70, out)
        if (piccola !== bmp) piccola.recycle()
        bmp.recycle()
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    /** Elenca gli elementi con testo o toccabili, con coordinate in pixel della foto. */
    private fun leggiElementi(): String {
        elementi.clear()
        centri.clear()
        val righe = StringBuilder()
        var n = 0
        val r = Rect()
        fun visita(nodo: AccessibilityNodeInfo?, prof: Int) {
            if (nodo == null || n >= 180 || prof > 40) return
            if (nodo.isVisibleToUser) {
                val testo = (nodo.text ?: nodo.contentDescription ?: nodo.hintText)
                    ?.toString()?.replace('\n', ' ')?.trim()?.take(60)
                val toccabile = nodo.isClickable || nodo.isLongClickable
                if (!testo.isNullOrEmpty() || toccabile || nodo.isEditable) {
                    nodo.getBoundsInScreen(r)
                    if (r.width() > 0 && r.height() > 0) {
                        n++
                        val cx = (r.centerX() * scala).roundToInt()
                        val cy = (r.centerY() * scala).roundToInt()
                        elementi[n] = nodo
                        centri[n] = r.centerX() to r.centerY()
                        val tipo = when {
                            nodo.isEditable -> "campo di testo"
                            nodo.isCheckable -> if (nodo.isChecked) "interruttore ON" else "interruttore OFF"
                            toccabile -> "toccabile"
                            else -> "testo"
                        }
                        righe.append("[$n] \"${testo ?: ""}\" ($tipo) @ $cx,$cy\n")
                    }
                }
            }
            for (i in 0 until nodo.childCount) visita(nodo.getChild(i), prof + 1)
        }
        val finestre = runCatching { windows }.getOrNull().orEmpty()
        if (finestre.isEmpty()) visita(rootInActiveWindow, 0)
        else finestre.forEach { visita(it.root, 0) }
        return if (righe.isEmpty()) "(nessun elemento leggibile: usa la foto)" else righe.toString()
    }

    // ---------- Mani ----------

    private fun reale(v: Int) = v / scala

    private fun esegui(g: GestureDescription): Boolean {
        val l = CountDownLatch(1)
        var ok = false
        val partito = dispatchGesture(g, object : GestureResultCallback() {
            override fun onCompleted(d: GestureDescription?) { ok = true; l.countDown() }
            override fun onCancelled(d: GestureDescription?) { l.countDown() }
        }, main)
        if (!partito) return false
        l.await(15, TimeUnit.SECONDS)
        return ok
    }

    private fun tratto(x1: Float, y1: Float, x2: Float, y2: Float, ms: Long) =
        GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(
            Path().apply { moveTo(x1, y1); lineTo(x2, y2) }, 0, max(1L, ms))).build()

    fun tocca(x: Int, y: Int) = esegui(tratto(reale(x), reale(y), reale(x), reale(y), 60))

    fun premiALungo(x: Int, y: Int) = esegui(tratto(reale(x), reale(y), reale(x), reale(y), 900))

    fun scorri(x1: Int, y1: Int, x2: Int, y2: Int, ms: Long) =
        esegui(tratto(reale(x1), reale(y1), reale(x2), reale(y2), ms))

    /** Tieni premuto e poi trascina: serve per spostare icone e cartelle. */
    fun trascina(x1: Int, y1: Int, x2: Int, y2: Int): Boolean {
        val ax = reale(x1); val ay = reale(y1); val bx = reale(x2); val by = reale(y2)
        val presa = GestureDescription.StrokeDescription(
            Path().apply { moveTo(ax, ay); lineTo(ax + 1, ay + 1) }, 0, 1000, true)
        if (!esegui(GestureDescription.Builder().addStroke(presa).build())) return false
        val corsa = presa.continueStroke(
            Path().apply { moveTo(ax + 1, ay + 1); lineTo(bx, by) }, 0, 1200, true)
        if (!esegui(GestureDescription.Builder().addStroke(corsa).build())) return false
        val rilascio = corsa.continueStroke(
            Path().apply { moveTo(bx, by); lineTo(bx + 1, by) }, 0, 500, false)
        return esegui(GestureDescription.Builder().addStroke(rilascio).build())
    }

    fun toccaElemento(id: Int): Boolean {
        val nodo = elementi[id] ?: return false
        var n: AccessibilityNodeInfo? = nodo
        while (n != null) {
            if (n.isClickable) return n.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            n = n.parent
        }
        val (x, y) = centri[id] ?: return false
        return esegui(tratto(x.toFloat(), y.toFloat(), x.toFloat(), y.toFloat(), 60))
    }

    /** Scrive nel campo che ha il cursore (o nel primo campo visibile). */
    fun scrivi(testo: String): Boolean {
        val campo = findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            ?: elementi.values.firstOrNull { it.isEditable }
            ?: return false
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, testo)
        }
        return campo.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    fun invio(): Boolean {
        val campo = findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return false
        return campo.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.id)
    }

    fun tasto(nome: String): Boolean = when (nome) {
        "back" -> performGlobalAction(GLOBAL_ACTION_BACK)
        "home" -> performGlobalAction(GLOBAL_ACTION_HOME)
        "recents" -> performGlobalAction(GLOBAL_ACTION_RECENTS)
        "notifications" -> performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
        "quick_settings" -> performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)
        "enter" -> invio()
        else -> false
    }

    /** Apre un'app cercandola per nome tra quelle del cassetto. */
    fun apriApp(nome: String): String {
        val pm = packageManager
        val cerca = nome.lowercase().trim()
        val app = pm.queryIntentActivities(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
            .map { it to it.loadLabel(pm).toString() }
        val trovata = app.firstOrNull { it.second.lowercase() == cerca }
            ?: app.firstOrNull { it.second.lowercase().contains(cerca) }
            ?: return "Nessuna app chiamata \"$nome\". App installate: " +
                app.map { it.second }.sorted().joinToString(", ")
        val intent = pm.getLaunchIntentForPackage(trovata.first.activityInfo.packageName)
            ?: return "Non riesco ad aprire ${trovata.second}"
        startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return "Aperta ${trovata.second}"
    }
}
