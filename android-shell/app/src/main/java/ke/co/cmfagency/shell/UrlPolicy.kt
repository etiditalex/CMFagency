package ke.co.cmfagency.shell

import android.net.Uri
import java.util.Locale

/**
 * Allowlist for the Play Store shell. Keep prefixes and blocked segments in sync with
 * `lib/android-shell.ts`. No payment secrets live here.
 */
object UrlPolicy {
    const val SITE_ORIGIN = "https://cmfagency.co.ke"
    const val HUB_PATH = "/app"

    val HUB_URI: Uri = Uri.parse("$SITE_ORIGIN$HUB_PATH")

    private val siteHosts = setOf("cmfagency.co.ke", "www.cmfagency.co.ke")

    private val allowedPathPrefixes = listOf(
        "/app",
        "/fusion-xpress/smart-visitor-management",
        "/fusion-xpress/reset-password",
        "/fusion-xpress/setup-authenticator",
        "/dashboard/visitor-management",
        "/dashboard/account",
        "/dashboard/invoices",
        "/dashboard/campaigns",
        "/pay",
        "/voting",
        "/receipt",
        "/verify-email",
        "/events/tickets",
        "/kcm/cfm-tickets",
    )

    private val blockedFirstSegments = setOf(
        "about",
        "admin",
        "api",
        "app",
        "application",
        "blogs",
        "career",
        "careers",
        "cart",
        "contact",
        "cookies",
        "dashboard",
        "events",
        "fusion-xpress",
        "invite",
        "invoice",
        "jobs",
        "kcm",
        "login",
        "marketing-fusion",
        "merchandise",
        "news",
        "nominate-models",
        "page-not-found",
        "pay",
        "portfolios",
        "privacy",
        "profile",
        "receipt",
        "research",
        "services",
        "talent",
        "terms",
        "testimonials",
        "track-application",
        "training",
        "verify-email",
        "voting",
    )

    private val allowedExternalHostSuffixes = listOf(
        "paystack.com",
        "paystack.co",
        "google.com",
        "gstatic.com",
        "recaptcha.net",
        "supabase.co",
        "supabase.in",
        "accounts.google.com",
    )

    fun isHttps(uri: Uri): Boolean = uri.scheme?.equals("https", ignoreCase = true) == true

    fun isSiteHost(host: String?): Boolean {
        val h = host?.lowercase(Locale.US) ?: return false
        return siteHosts.contains(h)
    }

    fun isAllowedExternalHost(host: String?): Boolean {
        val h = host?.lowercase(Locale.US) ?: return false
        return allowedExternalHostSuffixes.any { suffix ->
            h == suffix || h.endsWith(".$suffix")
        }
    }

    fun isAllowed(uri: Uri): Boolean {
        if (!isHttps(uri)) return false
        val host = uri.host ?: return false
        if (isAllowedExternalHost(host)) return true
        if (!isSiteHost(host)) return false
        return isAllowedSitePath(uri.path ?: "/")
    }

    fun isAllowedSitePath(rawPath: String): Boolean {
        val path = if (rawPath.startsWith("/")) rawPath else "/$rawPath"
        if (allowedPathPrefixes.any { prefix -> path == prefix || path.startsWith("$prefix/") }) {
            return true
        }
        val trimmed = path.trim('/')
        if (trimmed.isEmpty() || trimmed.contains('/')) return false
        return trimmed.lowercase(Locale.US) !in blockedFirstSegments
    }
}
