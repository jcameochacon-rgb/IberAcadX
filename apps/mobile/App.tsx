import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import PlatformWebView, {
  type PlatformWebViewHandle,
} from "./src/components/PlatformWebView";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { parseReportMessage, reportHtml, reportCsv } from "./src/report-export";

type WebConfig = { url: string; error: null } | { url: null; error: string };

function readWebConfig(): WebConfig {
  const value = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (!value) {
    return {
      url: null,
      error:
        "Configura EXPO_PUBLIC_WEB_URL en apps/mobile/.env con una dirección web accesible desde el teléfono.",
    };
  }

  try {
    const parsed = new URL(value);
    const localHosts = new Set(["localhost", "127.0.0.1", "10.0.2.2", "::1"]);
    const localHttp =
      parsed.protocol === "http:" && localHosts.has(parsed.hostname);

    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/" ||
      (parsed.protocol !== "https:" && !localHttp)
    ) {
      throw new Error("La URL no es un origen HTTPS válido.");
    }

    return { url: parsed.origin, error: null };
  } catch {
    return {
      url: null,
      error:
        "EXPO_PUBLIC_WEB_URL debe ser un origen HTTPS válido o una dirección loopback para un emulador local.",
    };
  }
}

const config = readWebConfig();

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileApp />
    </SafeAreaProvider>
  );
}

function MobileApp() {
  const webView = useRef<PlatformWebViewHandle>(null);
  const currentUrl = useRef(config.url || "");
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const exportBusy = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [linkError, setLinkError] = useState("");
  const webOrigin = useMemo(
    () => (config.url ? new URL(config.url).origin : ""),
    [],
  );

  const openExternal = useCallback((value: string) => {
    try {
      const target = new URL(value);
      if (
        target.protocol !== "https:" &&
        target.protocol !== "mailto:" &&
        target.protocol !== "tel:"
      ) {
        setLinkError("Se bloqueó un enlace externo no seguro.");
        return;
      }

      void Linking.openURL(target.href).catch(() => {
        setLinkError("No se pudo abrir el enlace en el dispositivo.");
      });
    } catch {
      setLinkError("El enlace externo no es válido.");
    }
  }, []);

  const shouldStartRequest = useCallback(
    (request: { url: string; isTopFrame?: boolean }) => {
      // Los iframes del CAPTCHA y del mapa no deben abrir el navegador externo.
      if (request.isTopFrame === false)
        return (
          request.url === "about:blank" || request.url.startsWith("https://")
        );

      try {
        const target = new URL(request.url);
        if (target.origin === webOrigin) return true;
        if (
          target.protocol === "https:" ||
          target.protocol === "mailto:" ||
          target.protocol === "tel:"
        ) {
          openExternal(target.href);
        }
      } catch {
        return false;
      }
      return false;
    },
    [openExternal, webOrigin],
  );

  const exportReport = useCallback(
    async (url: string, raw: string) => {
      if (exportBusy.current) return;
      let temporary: File | null = null;
      try {
        if (new URL(url).origin !== webOrigin) return;
        const report = parseReportMessage(raw);
        if (!report) {
          setLinkError("No se pudo interpretar el informe.");
          return;
        }
        exportBusy.current = true;
        setExporting(true);
        if (!(await Sharing.isAvailableAsync()))
          throw new Error("No disponible");
        if (report.type === "iberacad.report.pdf") {
          const result = await Print.printToFileAsync({
            html: reportHtml(report),
            width: 842,
            height: 595,
          });
          temporary = new File(result.uri);
          await Sharing.shareAsync(result.uri, {
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
            dialogTitle: "Guardar o compartir informe",
          });
        } else {
          temporary = new File(Paths.cache, `IberAcad-${Date.now()}.csv`);
          temporary.write(reportCsv(report));
          await Sharing.shareAsync(temporary.uri, {
            mimeType: "text/csv",
            UTI: "public.comma-separated-values-text",
            dialogTitle: "Guardar o compartir CSV",
          });
        }
      } catch {
        setLinkError(
          "No se pudo exportar. Reintenta o abre el informe desde el navegador.",
        );
      } finally {
        try {
          if (temporary?.exists) temporary.delete();
        } catch {
          /* El sistema limpia la caché. */
        }
        exportBusy.current = false;
        setExporting(false);
      }
    },
    [webOrigin],
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!canGoBack || !webView.current) return false;
        webView.current.goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [canGoBack]);

  if (!config.url) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.messageCard}>
          <Text style={styles.brand}>IberAcad</Text>
          <Text style={styles.title}>Configura la plataforma web</Text>
          <Text style={styles.body}>{config.error}</Text>
          <Text style={styles.hint}>
            Usa el dominio HTTPS publicado o un túnel HTTPS para Next.js durante
            el desarrollo. El túnel de Expo solo conecta con Metro; no publica
            el servidor web.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.brand}>IberAcad</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recargar plataforma"
            onPress={() => webView.current?.reload()}
            style={styles.reloadButton}
          >
            <Text style={styles.reloadText}>Recargar</Text>
          </Pressable>
        </View>
        <View style={styles.webContainer}>
          <PlatformWebView
            key={config.url}
            ref={webView}
            source={{ uri: config.url }}
            originWhitelist={[
              "https://*",
              "http://localhost:*",
              "http://127.0.0.1:*",
              "http://10.0.2.2:*",
              "about:blank",
              "mailto:*",
              "tel:*",
            ]}
            onMessage={({ nativeEvent }) =>
              void exportReport(nativeEvent.url, nativeEvent.data)
            }
            onHttpError={({ nativeEvent }) => {
              if (
                nativeEvent.url === currentUrl.current &&
                nativeEvent.statusCode >= 400
              ) {
                setLoading(false);
                setLoadError(true);
              }
            }}
            onShouldStartLoadWithRequest={shouldStartRequest}
            onNavigationStateChange={(state) => {
              currentUrl.current = state.url;
              setCanGoBack(state.canGoBack);
            }}
            onLoadStart={({ nativeEvent }) => {
              currentUrl.current = nativeEvent.url;
              setLoading(true);
              setLoadError(false);
              setProgress(0);
            }}
            onLoadProgress={({ nativeEvent }) =>
              setProgress(nativeEvent.progress)
            }
            onLoadEnd={() => {
              setLoading(false);
              setProgress(1);
            }}
            onError={() => {
              setLoading(false);
              setLoadError(true);
            }}
            javaScriptEnabled
            style={styles.webView}
          />
          {loading && !loadError ? (
            <View
              accessibilityLabel="Cargando plataforma"
              style={styles.progressTrack}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(progress * 100, 8)}%` },
                ]}
              />
            </View>
          ) : null}
          {loadError ? (
            <View style={styles.errorOverlay}>
              <Text style={styles.title}>No se pudo cargar IberAcad</Text>
              <Text style={styles.body}>
                Comprueba la dirección, la conexión a Internet y que el servidor
                web esté disponible.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => webView.current?.reload()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        {exporting && (
          <View accessibilityLiveRegion="polite" style={styles.toolbar}>
            <Text style={styles.body}>Preparando informe…</Text>
          </View>
        )}
        {linkError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setLinkError("")}
            style={styles.linkError}
          >
            <Text style={styles.linkErrorText}>
              {linkError} Toca para cerrar.
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f7fb" },
  container: { flex: 1 },
  toolbar: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#d7e3ed",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  brand: { color: "#102a43", fontSize: 18, fontWeight: "800" },
  reloadButton: { paddingHorizontal: 10, paddingVertical: 8 },
  reloadText: { color: "#1769aa", fontSize: 14, fontWeight: "700" },
  webContainer: { flex: 1 },
  webView: { backgroundColor: "#ffffff", flex: 1 },
  progressTrack: {
    height: 3,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  progressFill: { backgroundColor: "#1769aa", height: 3 },
  messageCard: {
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e3ed",
    borderRadius: 18,
    borderWidth: 1,
    margin: 24,
    maxWidth: 520,
    padding: 24,
    width: "90%",
  },
  title: { color: "#102a43", fontSize: 22, fontWeight: "800" },
  body: { color: "#435d73", fontSize: 15, lineHeight: 23, marginTop: 12 },
  hint: { color: "#63788b", fontSize: 13, lineHeight: 20, marginTop: 18 },
  errorOverlay: {
    alignItems: "center",
    backgroundColor: "#f3f7fb",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: 28,
    position: "absolute",
    right: 0,
    top: 0,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#1769aa",
    borderRadius: 10,
    marginTop: 20,
    minWidth: 140,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  retryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  linkError: {
    backgroundColor: "#fff1f0",
    borderTopColor: "#f2c7c4",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  linkErrorText: { color: "#a52828", fontSize: 13, textAlign: "center" },
});
