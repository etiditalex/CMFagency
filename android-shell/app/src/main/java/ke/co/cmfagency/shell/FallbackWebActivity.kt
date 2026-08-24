package ke.co.cmfagency.shell

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * Last-resort viewer when Chrome Custom Tabs are unavailable.
 * Off-allowlist URLs are blocked. Paystack/Google open in an external tab when possible.
 */
class FallbackWebActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_fallback_web)
        webView = findViewById(R.id.webview)

        val start = intent?.data ?: UrlPolicy.HUB_URI
        if (!UrlPolicy.isAllowed(start)) {
            Toast.makeText(this, R.string.url_blocked, Toast.LENGTH_LONG).show()
            finish()
            return
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_NO_CACHE
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return handleUri(request.url)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val origin = request.origin
                if (origin != null && UrlPolicy.isSiteHost(origin.host)) {
                    request.grant(request.resources)
                } else {
                    request.deny()
                }
            }
        }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) webView.goBack() else finish()
                }
            },
        )

        webView.loadUrl(start.toString())
    }

    private fun handleUri(uri: Uri): Boolean {
        if (!UrlPolicy.isAllowed(uri)) {
            Toast.makeText(this, R.string.url_blocked, Toast.LENGTH_SHORT).show()
            return true
        }
        if (!UrlPolicy.isSiteHost(uri.host) && LiveSiteLauncher.tryCustomTab(this, uri)) {
            return true
        }
        return false
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}
