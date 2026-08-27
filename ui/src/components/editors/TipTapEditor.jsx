import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

import { createMedia } from "../../services";

import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Undo,
  Redo,
  ImagePlus,
  Upload,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Minus,
  Eraser,
} from "lucide-react";

export default function ArticleEditor({ content, setContent }) {
  const [imageUrl, setImageUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Uploads a real image File (from the file picker, a drag-and-drop, or a
  // pasted screenshot) through the same /media/upload -> Cloudinary
  // pipeline the Featured Image picker uses, then inserts the resulting
  // URL into the editor at the current cursor position.
  const uploadAndInsertImage = async (file) => {
    if (!file || !file.type?.startsWith("image/")) return;

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append("file", file);

      const media = await createMedia(formData);

      editor?.chain().focus().setImage({ src: media.url }).run();
    } catch (err) {
      console.error("Image upload failed", err);
    } finally {
      setUploadingImage(false);
    }
  };

  // NOTE: Link, Underline, and HorizontalRule are already bundled inside
  // StarterKit (Tiptap v3). Registering them again as separate extensions
  // causes duplicate-extension conflicts, so we configure them here instead.
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
        },
      }),

      Image,

      Placeholder.configure({
        placeholder: "Start writing your article...",
      }),
    ],

    content: content || "<p></p>",

    onUpdate({ editor }) {
      setContent(editor.getHTML());
    },

    editorProps: {
      handlePaste(view, event) {
        // A real image was pasted (e.g. a screenshot copied from the OS) —
        // upload it instead of trying to read it as text.
        const files = Array.from(event.clipboardData?.files || []).filter(
          (f) => f.type?.startsWith("image/")
        );

        if (files.length) {
          event.preventDefault();
          files.forEach(uploadAndInsertImage);
          return true;
        }

        const text = event.clipboardData.getData("text/plain");

        // auto detect image url (also matches URLs with query strings, e.g. ?w=800)
        if (text && /\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i.test(text)) {
          event.preventDefault();

          editor.chain().focus().setImage({ src: text }).run();

          return true;
        }

        // allow normal html paste
        return false;
      },

      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files || []).filter(
          (f) => f.type?.startsWith("image/")
        );

        if (files.length) {
          event.preventDefault();
          files.forEach(uploadAndInsertImage);
          return true;
        }

        return false;
      },
    },
  });

  // Keep the editor in sync if `content` changes from outside (e.g. an
  // article loaded asynchronously after this component already mounted,
  // such as on an Edit Article screen). Without this, the editor would
  // stay stuck on its initial empty value.
  useEffect(() => {
    if (!editor) return;

    const incoming = content || "<p></p>";

    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const btn = (active) =>
    `p-2 rounded transition-colors hover:bg-[var(--os-nav-hover)] ${
      active ? "bg-[var(--os-nav-active)]" : ""
    }`;

  const divider = (
    <div className="w-px h-5 bg-[var(--os-border-soft)] mx-1" />
  );

  const addImage = () => {
    if (!imageUrl) return;

    editor.chain().focus().setImage({ src: imageUrl }).run();

    setImageUrl("");
  };

  const openLinkPopover = () => {
    // Pre-fill with the existing link href when editing an active link
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkPopoverOpen(true);
  };

  const applyLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }

    setLinkPopoverOpen(false);
    setLinkUrl("");
  };

  return (
    <div className="rounded-lg shadow-md bg-[var(--os-bg-input)] flex flex-col h-full min-h-[420px] overflow-hidden">
      {/* TOOLBAR */}

      <div className="relative flex flex-wrap items-center gap-1 border-b border-[var(--os-border-soft)] p-2 bg-[var(--os-bg-main)]">
        {/* UNDO REDO */}

        <button
          type="button"
          aria-label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          className={btn(false)}
        >
          <Undo size={16} />
        </button>

        <button
          type="button"
          aria-label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          className={btn(false)}
        >
          <Redo size={16} />
        </button>

        {divider}

        {/* HEADINGS */}

        <button
          type="button"
          aria-label="Heading 1"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={btn(editor.isActive("heading", { level: 1 }))}
        >
          <Heading1 size={16} />
        </button>

        <button
          type="button"
          aria-label="Heading 2"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={btn(editor.isActive("heading", { level: 2 }))}
        >
          <Heading2 size={16} />
        </button>

        <button
          type="button"
          aria-label="Heading 3"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={btn(editor.isActive("heading", { level: 3 }))}
        >
          <Heading3 size={16} />
        </button>

        {divider}

        {/* TEXT */}

        <button
          type="button"
          aria-label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive("bold"))}
        >
          <Bold size={16} />
        </button>

        <button
          type="button"
          aria-label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive("italic"))}
        >
          <Italic size={16} />
        </button>

        <button
          type="button"
          aria-label="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btn(editor.isActive("underline"))}
        >
          <UnderlineIcon size={16} />
        </button>

        <button
          type="button"
          aria-label="Add link"
          onClick={openLinkPopover}
          className={btn(editor.isActive("link"))}
        >
          <LinkIcon size={16} />
        </button>

        {/* LINK POPOVER */}

        {linkPopoverOpen && (
          <div className="absolute top-full left-0 mt-1 z-10 flex items-center gap-2 p-2 rounded border border-[var(--os-border-main)] bg-[var(--os-bg-input)] shadow-md">
            <input
              type="text"
              autoFocus
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") setLinkPopoverOpen(false);
              }}
              className="text-xs border border-[var(--os-border-main)] rounded px-2 py-1 w-56 bg-[var(--os-bg-content)]"
            />

            <button
              type="button"
              onClick={applyLink}
              className="text-xs px-2 py-1 rounded bg-[var(--os-primary)] text-white hover:bg-[var(--os-primary-hover)]"
            >
              {linkUrl ? "Apply" : "Remove"}
            </button>

            <button
              type="button"
              aria-label="Cancel"
              onClick={() => setLinkPopoverOpen(false)}
              className="text-xs px-2 py-1 rounded hover:bg-[var(--os-nav-hover)]"
            >
              ✕
            </button>
          </div>
        )}

        {divider}

        {/* LIST */}

        <button
          type="button"
          aria-label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive("bulletList"))}
        >
          <List size={16} />
        </button>

        <button
          type="button"
          aria-label="Ordered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive("orderedList"))}
        >
          <ListOrdered size={16} />
        </button>

        {divider}

        {/* BLOCK */}

        <button
          type="button"
          aria-label="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btn(editor.isActive("blockquote"))}
        >
          <Quote size={16} />
        </button>

        <button
          type="button"
          aria-label="Code block"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={btn(editor.isActive("codeBlock"))}
        >
          <Code size={16} />
        </button>

        <button
          type="button"
          aria-label="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btn(false)}
        >
          <Minus size={16} />
        </button>

        {divider}

        {/* CLEAR FORMAT */}

        <button
          type="button"
          aria-label="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
          className={btn(false)}
        >
          <Eraser size={16} />
        </button>

        {divider}

        {/* IMAGE */}

        <div className="flex items-center gap-2 ml-2">
          <ImagePlus size={16} />

          <input
            type="text"
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addImage()}
            className="text-xs border border-[var(--os-border-main)] rounded px-2 py-1 w-40 bg-[var(--os-bg-content)]"
          />

          <button
            type="button"
            onClick={addImage}
            className="text-xs px-2 py-1 bg-[var(--os-primary)] hover:bg-[var(--os-primary-hover)] text-white rounded"
          >
            Add
          </button>

          <span className="text-xs opacity-40">or</span>

          <button
            type="button"
            aria-label="Upload image from device"
            disabled={uploadingImage}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-[var(--os-border-main)] hover:bg-[var(--os-nav-hover)] disabled:opacity-50"
          >
            <Upload size={14} />
            {uploadingImage ? "Uploading..." : "Upload"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              uploadAndInsertImage(file);
              // allow selecting the same file again later
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* EDITOR */}

      <EditorContent
        editor={editor}
        className="os-editor-surface flex-1 p-6 overflow-y-auto cursor-text prose max-w-none"
      />
    </div>
  );
}
