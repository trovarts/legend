plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "it.trovarts.agente"
    compileSdk = 35

    defaultConfig {
        applicationId = "it.trovarts.agente"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    // Chiave fissa nel repo: ogni nuova versione si installa sopra la vecchia.
    signingConfigs {
        create("fissa") {
            storeFile = file("agente.keystore")
            storePassword = "agente"
            keyAlias = "agente"
            keyPassword = "agente"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("fissa")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    packaging {
        resources {
            excludes += setOf("/META-INF/{AL2.0,LGPL2.1}", "META-INF/versions/**", "META-INF/DEPENDENCIES", "META-INF/LICENSE*", "META-INF/NOTICE*")
        }
    }
}

dependencies {
    implementation("com.anthropic:anthropic-java:2.68.0")
}
