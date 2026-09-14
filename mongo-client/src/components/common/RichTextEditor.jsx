"use client";

import React, { useEffect, useRef, useState } from "react";

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Enter text...",
  disabled = false,
  readOnly = false,
  rows,
  minHeight = 120,
  style,
}) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const lastEmittedValueRef = useRef(value || "");
  const isInternalChangeRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const [mounted, setMounted] = useState(false);

  // Keep onChangeRef updated with the latest onChange prop from parent
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || quillRef.current) return;

    // Load Quill synchronously on client
    const Quill = require("quill").default || require("quill");

    containerRef.current.innerHTML = "";
    const editorContainer = document.createElement("div");
    containerRef.current.appendChild(editorContainer);

    const modules = {
      toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ["link", "clean"],
      ],
    };

    const quillInstance = new Quill(editorContainer, {
      theme: "snow",
      placeholder,
      readOnly: disabled || readOnly,
      modules,
    });

    quillRef.current = quillInstance;

    // Set initial HTML content if provided
    const initialVal = value || "";
    if (initialVal) {
      isInternalChangeRef.current = true;
      quillInstance.clipboard.dangerouslyPasteHTML(initialVal);
      lastEmittedValueRef.current = initialVal;
      isInternalChangeRef.current = false;
    }

    // Listen for user edits inside Quill using the latest onChangeRef
    quillInstance.on("text-change", () => {
      if (isInternalChangeRef.current) return;

      const html = quillInstance.root.innerHTML || "";
      const normalized = (html === "<p><br></p>" || html === "<p></p>") ? "" : html;

      lastEmittedValueRef.current = normalized;
      onChangeRef.current?.(normalized);
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      quillRef.current = null;
    };
  }, [mounted]);

  // Sync external value changes from parent (e.g. form load or reset)
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const incomingValue = value || "";

    // Skip DOM re-pasting if incoming value matches what editor just emitted
    if (incomingValue === lastEmittedValueRef.current) {
      return;
    }

    // Handle external value update (form reset or async data load)
    isInternalChangeRef.current = true;
    if (!incomingValue) {
      quill.setText("");
    } else {
      quill.clipboard.dangerouslyPasteHTML(incomingValue);
    }
    lastEmittedValueRef.current = incomingValue;
    isInternalChangeRef.current = false;
  }, [value]);

  // Handle readOnly / disabled state updates
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!disabled && !readOnly);
    }
  }, [disabled, readOnly]);

  const computedMinHeight = rows ? `${rows * 30}px` : `${minHeight}px`;

  if (!mounted) {
    return (
      <div className="p-3 border rounded-md bg-slate-50 text-slate-400 text-sm flex items-center gap-2">
        <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
        Loading Editor...
      </div>
    );
  }

  return (
    <div
      className={`rich-text-editor-wrapper ${disabled || readOnly ? "disabled-editor" : ""}`}
      style={style}
    >
      <div ref={containerRef} className="quill-editor-container" />
      <style jsx global>{`
        .rich-text-editor-wrapper .ql-toolbar.ql-snow {
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
          border-color: #d9d9d9;
          background-color: #f8fafc;
        }
        .rich-text-editor-wrapper .ql-container.ql-snow {
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
          border-color: #d9d9d9;
          min-height: ${computedMinHeight};
          font-family: inherit;
          font-size: 14px;
        }
        .rich-text-editor-wrapper.disabled-editor .ql-toolbar.ql-snow {
          background-color: #f5f5f5;
          opacity: 0.7;
          pointer-events: none;
        }
        .rich-text-editor-wrapper.disabled-editor .ql-container.ql-snow {
          background-color: #f5f5f5;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: ${computedMinHeight};
        }
      `}</style>
    </div>
  );
}
