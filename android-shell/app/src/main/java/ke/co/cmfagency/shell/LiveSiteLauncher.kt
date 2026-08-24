package ke.co.cmfagency.shell

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import com.google.androidbrowserhelper.trusted.TwaLauncher

object LiveSiteLauncher {
    fun openHub(context: Context) {
        open(context, UrlPolicy.HUB_URI)
    }

    fun open(context: Context, uri: Uri) {
        if (!UrlPolicy.isAllowed(uri)) {
            return
        }
        if (tryTwa(context, uri)) return
        if (tryCustomTab(context, uri)) return
        openFallbackWebView(context, uri)
    }

    private fun tryTwa(context: Context, uri: Uri): Boolean {
        return try {
            TwaLauncher(context).launch(uri)
            true
        } catch (_: Throwable) {
            false
        }
    }

    fun tryCustomTab(context: Context, uri: Uri): Boolean {
        return try {
            val toolbar = ContextCompat.getColor(context, R.color.primary)
            val color = CustomTabColorSchemeParams.Builder()
                .setToolbarColor(toolbar)
                .build()
            val intent = CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(color)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .setUrlBarHidingEnabled(true)
                .setShowTitle(true)
                .build()
            intent.launchUrl(context, uri)
            true
        } catch (_: ActivityNotFoundException) {
            false
        } catch (_: Throwable) {
            false
        }
    }

    private fun openFallbackWebView(context: Context, uri: Uri) {
        val intent = Intent(context, FallbackWebActivity::class.java).apply {
            data = uri
            if (context !is android.app.Activity) {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        }
        context.startActivity(intent)
    }
}
