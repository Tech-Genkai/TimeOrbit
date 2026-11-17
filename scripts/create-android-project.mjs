import fs from 'fs';
import path from 'path';

const baseDir = path.resolve(process.cwd(), 'android');

// 1. Create directories
const dirs = [
  baseDir,
  path.join(baseDir, 'gradle', 'wrapper'),
  path.join(baseDir, 'app'),
  path.join(baseDir, 'app', 'src', 'main', 'java', 'com', 'timeorbit', 'app'),
  path.join(baseDir, 'app', 'src', 'main', 'res', 'values'),
];

for (const d of dirs) {
  fs.mkdirSync(d, { recursive: true });
}

// 2. settings.gradle
fs.writeFileSync(
  path.join(baseDir, 'settings.gradle'),
  `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "TimeOrbit"
include ':app'
`
);

// 2b. gradle.properties
fs.writeFileSync(
  path.join(baseDir, 'gradle.properties'),
  `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
`
);

// 3. Root build.gradle
fs.writeFileSync(
  path.join(baseDir, 'build.gradle'),
  `plugins {
    id 'com.android.application' version '8.2.2' apply false
}
task clean(type: Delete) {
    delete rootProject.buildDir
}
`
);

// 4. gradle-wrapper.properties
fs.writeFileSync(
  path.join(baseDir, 'gradle', 'wrapper', 'gradle-wrapper.properties'),
  `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
);

// 5. app/build.gradle
fs.writeFileSync(
  path.join(baseDir, 'app', 'build.gradle'),
  `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.timeorbit.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.timeorbit.app"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.webkit:webkit:1.10.0'
}
`
);

// 6. AndroidManifest.xml
fs.writeFileSync(
  path.join(baseDir, 'app', 'src', 'main', 'AndroidManifest.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:icon="@mipmap/ic_launcher"
        android:label="TimeOrbit"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.TimeOrbit">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:theme="@style/Theme.TimeOrbit.Fullscreen">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`
);

// 7. res/values/styles.xml & colors.xml & strings.xml
fs.writeFileSync(
  path.join(baseDir, 'app', 'src', 'main', 'res', 'values', 'styles.xml'),
  `<resources>
    <style name="Theme.TimeOrbit" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="android:statusBarColor">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
    </style>
    <style name="Theme.TimeOrbit.Fullscreen" parent="Theme.TimeOrbit">
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">false</item>
    </style>
</resources>
`
);

fs.writeFileSync(
  path.join(baseDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
  `<resources>
    <string name="app_name">TimeOrbit</string>
</resources>
`
);

// 8. MainActivity.java (Full-screen Hardware Accelerated WebGL WebView)
fs.writeFileSync(
  path.join(baseDir, 'app', 'src', 'main', 'java', 'com', 'timeorbit', 'app', 'MainActivity.java'),
  `package com.timeorbit.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private static final String APP_URL = "https://timeorbit-chi.vercel.app";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " TimeOrbitApp/1.0.0");

        // Hardware Acceleration for WebGL 3D Earth rendering
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

        // Inject Native App Bridge identifier
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public boolean isNative() {
                return true;
            }
        }, "TimeOrbitNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://timeorbit-chi.vercel.app")) {
                    return false;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        setContentView(webView);
        webView.loadUrl(APP_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`
);

// 9. Copy mipmap icons if available
const srcAndroidIcons = path.resolve(process.cwd(), 'src-tauri', 'icons', 'android');
if (fs.existsSync(srcAndroidIcons)) {
  fs.cpSync(srcAndroidIcons, path.join(baseDir, 'app', 'src', 'main', 'res'), { recursive: true });
}

console.log('✅ Android native project generated successfully at ./android');
