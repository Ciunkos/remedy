//
//  ContentView.swift
//  remedy
//
//  Created by Przemysław Zalewski on 12/10/2022.
//

import SwiftUI
import WebKit

#if os(iOS)
typealias WebViewRepresentable = UIViewRepresentable
#elseif os(macOS)
typealias WebViewRepresentable = NSViewRepresentable
#endif

struct WebView : WebViewRepresentable {
    public init(url: URL) {
        self.url = url
        self.configuration = { _ in }
    }

    public init(
        url: URL? = nil,
        configuration: @escaping (WKWebView) -> Void = { _ in }) {
        self.url = url
        self.configuration = configuration
    }

    private let url: URL?
    private let configuration: (WKWebView) -> Void
    
#if os(iOS)
public func makeUIView(context: Context) -> WKWebView {
    makeView()
}

public func updateUIView(_ uiView: WKWebView, context: Context) {}
#endif
    
#if os(macOS)
public func makeNSView(context: Context) -> WKWebView {
    makeView()
}

public func updateNSView(_ view: WKWebView, context: Context) {}
#endif
    
    func makeView() -> WKWebView {
           let view = WKWebView()
           configuration(view)
           tryLoad(url, into: view)
           return view
       }

       func tryLoad(_ url: URL?, into view: WKWebView) {
           guard let url = url else { return }
           view.load(URLRequest(url: url))
       }
}

struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://przemyslawzalewski.pl"))
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
