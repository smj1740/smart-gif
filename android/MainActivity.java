package io.github.smj1740.smartgif;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLConnection;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int OPEN = 1;
    private static final int SAVE = 2;
    private final ExecutorService writer = Executors.newSingleThreadExecutor();
    private final SaveBridge saveBridge = new SaveBridge();
    private ValueCallback<Uri[]> chooser;
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        web.addJavascriptInterface(saveBridge, "AndroidGif");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (isLocal(url)) return false;
                if (request.isForMainFrame() && request.hasGesture() && "https".equals(url.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, url));
                    } catch (ActivityNotFoundException ignored) {
                        notifyUser("링크를 열 수 없어요.");
                    }
                }
                return true;
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!isLocal(url)) return missing();
                String path = url.getPath();
                if (path == null || path.contains("..")) return missing();
                String name = path.substring(1);
                try {
                    String type = name.endsWith(".wasm") ? "application/wasm"
                        : name.endsWith(".js") ? "text/javascript"
                        : URLConnection.guessContentTypeFromName(name);
                    Map<String, String> headers = new HashMap<>();
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(type == null ? "application/octet-stream" : type,
                        null, 200, "OK", headers, getAssets().open(name));
                } catch (IOException error) {
                    return missing();
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                       FileChooserParams request) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                String[] types = request.getAcceptTypes();
                for (String type : types) {
                    if (type.contains("gif")) {
                        intent.setType("image/gif");
                        break;
                    }
                }
                try {
                    startActivityForResult(intent, OPEN);
                } catch (ActivityNotFoundException error) {
                    chooser = null;
                    callback.onReceiveValue(null);
                }
                return true;
            }
        });
        setContentView(web);
        if (state == null || web.restoreState(state) == null) {
            web.loadUrl("https://" + HOST + "/index.html#editor");
        }
    }

    private static boolean isLocal(Uri url) {
        return "https".equals(url.getScheme()) && HOST.equals(url.getHost());
    }

    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        web.saveState(state);
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == OPEN && chooser != null) {
            ValueCallback<Uri[]> callback = chooser;
            chooser = null;
            callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
        } else if (request == SAVE) {
            File file = saveBridge.take();
            if (file == null) return;
            Uri destination = result == RESULT_OK && data != null ? data.getData() : null;
            if (destination == null) {
                file.delete();
                return;
            }
            writer.execute(() -> writeDocument(file, destination));
        }
    }

    private void writeDocument(File file, Uri destination) {
        try (FileInputStream input = new FileInputStream(file);
             OutputStream output = getContentResolver().openOutputStream(destination, "wt")) {
            if (output == null) throw new IOException("No output stream");
            byte[] buffer = new byte[65536];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            notifyUser("파일을 저장했어요.");
        } catch (IOException | SecurityException error) {
            notifyUser("파일을 저장하지 못했어요.");
        } finally {
            file.delete();
        }
    }

    private void notifyUser(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }

    public final class SaveBridge {
        private File file;

        @JavascriptInterface public synchronized boolean begin() {
            if (file != null) return false;
            try {
                file = File.createTempFile("smart-gif-", ".tmp", getCacheDir());
                return true;
            } catch (IOException error) {
                return false;
            }
        }

        @JavascriptInterface public synchronized boolean append(String encoded) {
            if (file == null || encoded.length() > 400000) return false;
            try (FileOutputStream output = new FileOutputStream(file, true)) {
                output.write(Base64.decode(encoded, Base64.DEFAULT));
                return true;
            } catch (IOException | IllegalArgumentException error) {
                return false;
            }
        }

        @JavascriptInterface public void finish(String name, String type) {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(type);
                intent.putExtra(Intent.EXTRA_TITLE, name);
                try {
                    startActivityForResult(intent, SAVE);
                } catch (ActivityNotFoundException error) {
                    cancel();
                    notifyUser("저장 위치를 선택할 수 없어요.");
                }
            });
        }

        @JavascriptInterface public synchronized void cancel() {
            File pending = take();
            if (pending != null) pending.delete();
        }

        synchronized File take() {
            File pending = file;
            file = null;
            return pending;
        }
    }
}
