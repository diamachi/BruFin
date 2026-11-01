package com.diamachi.brufin;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Listen for system bars and cutout insets and pass exact DP values into CSS
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
            Insets statusBarInsets = insets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets navBarInsets = insets.getInsets(
                WindowInsetsCompat.Type.navigationBars()
            );

            float density = getResources().getDisplayMetrics().density;
            int topDp = Math.round(statusBarInsets.top / density);
            int bottomDp = Math.round(navBarInsets.bottom / density);

            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                String js = String.format(
                    java.util.Locale.US,
                    "try {" +
                    "  document.documentElement.style.setProperty('--safe-area-inset-top', '%dpx');" +
                    "  document.documentElement.style.setProperty('--safe-area-inset-bottom', '%dpx');" +
                    "  document.documentElement.style.setProperty('--android-status-bar-height', '%dpx');" +
                    "  document.documentElement.style.setProperty('--android-nav-bar-height', '%dpx');" +
                    "} catch(e) {}",
                    topDp, bottomDp, topDp, bottomDp
                );
                webView.post(() -> webView.evaluateJavascript(js, null));
            }
            return insets;
        });
    }
}
