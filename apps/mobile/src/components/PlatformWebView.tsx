import { forwardRef } from "react";
import { WebView, type WebViewProps } from "react-native-webview";
export type PlatformWebViewHandle = WebView<Record<never, never>>;
// API pública: evita importaciones circulares al resolver .android/.ios.
const PlatformWebView = forwardRef<PlatformWebViewHandle, WebViewProps>(
  (props, ref) => (
    <WebView<Record<never, never>>
      {...props}
      ref={ref}
      domStorageEnabled
      thirdPartyCookiesEnabled
      sharedCookiesEnabled
      allowsBackForwardNavigationGestures
      setSupportMultipleWindows={false}
      mixedContentMode="never"
      allowFileAccess={false}
    />
  ),
);
PlatformWebView.displayName = "PlatformWebView";
export default PlatformWebView;
