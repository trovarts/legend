package it.trovarts.agente

import android.app.Activity
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.speech.RecognizerIntent
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/** Schermata unica: chiave, permesso, comando (anche a voce), diario di quello che fa. */
class MainActivity : Activity() {

    private val prefs by lazy { getSharedPreferences("agente", MODE_PRIVATE) }
    private lateinit var statoServizio: TextView
    private lateinit var bottoneServizio: Button
    private lateinit var chiave: EditText
    private lateinit var comando: EditText
    private lateinit var diario: TextView
    private lateinit var scorri: ScrollView

    private val VOCE = 7

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val dp = resources.displayMetrics.density
        fun pad(v: View) = v.apply { setPadding(0, (8 * dp).toInt(), 0, (8 * dp).toInt()) }

        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((16 * dp).toInt(), (16 * dp).toInt(), (16 * dp).toInt(), (16 * dp).toInt())
        }

        col.addView(TextView(this).apply {
            text = "🤖 Agente"
            textSize = 26f
            setTypeface(typeface, Typeface.BOLD)
        })

        // 1. Permesso di accessibilità
        statoServizio = TextView(this).apply { textSize = 15f }
        bottoneServizio = Button(this).apply {
            text = "Attiva l'Agente in Accessibilità"
            setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        }
        col.addView(pad(statoServizio))
        col.addView(bottoneServizio)

        // 2. Chiave API
        chiave = EditText(this).apply {
            hint = "Chiave API (sk-ant-…)"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(prefs.getString("chiave", ""))
        }
        val rigaChiave = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        rigaChiave.addView(chiave, LinearLayout.LayoutParams(0, -2, 1f))
        rigaChiave.addView(Button(this).apply {
            text = "Salva"
            setOnClickListener {
                prefs.edit().putString("chiave", chiave.text.toString().trim()).apply()
                Toast.makeText(this@MainActivity, "Chiave salvata", Toast.LENGTH_SHORT).show()
            }
        })
        col.addView(rigaChiave)
        col.addView(Button(this).apply {
            text = "Non ho la chiave: creala qui"
            setOnClickListener {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://console.anthropic.com/settings/keys")))
            }
        })

        // 3. Comando
        comando = EditText(this).apply {
            hint = "Cosa devo fare? Es. «Metti tutte le app di foto in una cartella Foto»"
            minLines = 3
            gravity = android.view.Gravity.TOP
        }
        col.addView(pad(comando))

        val bottoni = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        fun bottone(t: String, azione: () -> Unit) = Button(this).apply {
            text = t
            setOnClickListener { azione() }
        }.also { bottoni.addView(it, LinearLayout.LayoutParams(0, -2, 1f)) }
        bottone("▶️ Vai") { vai() }
        bottone("🎤 Parla") { parla() }
        bottone("⏹️ Stop") { Agente.ferma() }
        col.addView(bottoni)
        col.addView(Button(this).apply {
            text = "🆕 Nuova conversazione"
            setOnClickListener {
                Agente.nuovaConversazione()
                diario.text = ""
            }
        })

        diario = TextView(this).apply {
            textSize = 14f
            setTextIsSelectable(true)
            text = Agente.testoDiario
        }
        col.addView(pad(diario))

        scorri = ScrollView(this).apply { addView(col) }
        setContentView(scorri)
    }

    override fun onResume() {
        super.onResume()
        val attivo = AgentService.istanza != null
        statoServizio.text = if (attivo) "✅ Permesso di accessibilità attivo"
        else "⚠️ Serve il permesso di accessibilità (una volta sola)"
        bottoneServizio.visibility = if (attivo) View.GONE else View.VISIBLE
        diario.text = Agente.testoDiario
        Agente.diario = { riga ->
            runOnUiThread {
                diario.append(riga + "\n")
                scorri.post { scorri.fullScroll(View.FOCUS_DOWN) }
            }
        }
    }

    override fun onPause() {
        super.onPause()
        Agente.diario = null
    }

    private fun vai() {
        val k = chiave.text.toString().trim()
        val c = comando.text.toString().trim()
        when {
            k.isEmpty() -> toast("Prima inserisci e salva la chiave API")
            c.isEmpty() -> toast("Scrivi cosa devo fare")
            AgentService.istanza == null -> toast("Prima attiva l'Agente in Accessibilità")
            Agente.inCorso -> toast("Sto già lavorando: premi Stop per fermarmi")
            else -> {
                prefs.edit().putString("chiave", k).apply()
                Agente.scrivi("👤 $c")
                comando.setText("")
                Agente.avvia(k, c)
            }
        }
    }

    private fun parla() {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT")
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Cosa devo fare?")
        runCatching { startActivityForResult(i, VOCE) }
            .onFailure { toast("Riconoscimento vocale non disponibile") }
    }

    @Deprecated("API semplice e sufficiente qui")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == VOCE && resultCode == RESULT_OK) {
            val detto = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!detto.isNullOrBlank()) comando.setText(detto)
        }
    }

    private fun toast(t: String) = Toast.makeText(this, t, Toast.LENGTH_LONG).show()
}
