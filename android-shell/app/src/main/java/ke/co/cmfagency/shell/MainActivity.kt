package ke.co.cmfagency.shell

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Play Store entry: opens the live /app hub in Chrome TWA (Custom Tabs fallback).
 * No API keys, no payment SDK.
 */
class MainActivity : AppCompatActivity() {
    private var launchedLiveSite = false
    private var skipNextResumeFinish = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val deepLink = intent?.data
        if (deepLink != null && UrlPolicy.isAllowed(deepLink)) {
            LiveSiteLauncher.open(this, deepLink)
        } else {
            LiveSiteLauncher.openHub(this)
        }
        launchedLiveSite = true
        skipNextResumeFinish = true
    }

    override fun onResume() {
        super.onResume()
        if (!launchedLiveSite) return
        if (skipNextResumeFinish) {
            skipNextResumeFinish = false
            return
        }
        finish()
    }
}
