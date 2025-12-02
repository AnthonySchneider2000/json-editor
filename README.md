# Crimson Voyager - Advanced JSON Editor

A modern, feature-rich JSON editor built with Next.js 16, React 19, and Tailwind CSS 4. This application provides a powerful dual-view interface, allowing you to manipulate JSON data through both a raw code editor and an interactive tree view.

## Features

### 🌳 Interactive Tree View
- **Visual Editing**: Navigate and manipulate JSON structures visually.
- **Drag & Drop Reordering**: Easily reorder array items and object keys via drag and drop.
- **Type-Aware Editing**: Edit values with automatic type validation (String, Number, Boolean, Null, Object, Array).
- **Context Actions**: Quick access to add, edit, and delete operations.

### 📝 Raw JSON Editor
- **Monaco Editor Integration**: Full-featured code editor experience (VS Code-like).
- **Real-time Sync**: Changes in the tree view are immediately reflected in the code editor and vice versa.
- **Syntax Highlighting**: Proper coloring and formatting for JSON data.

### ⚡ Advanced Operations
- **Smart Selection**: Support for Single, Multi-select (Ctrl/Cmd + Click), and Range select (Shift + Click).
- **Clipboard Support**: Copy, Cut, and Paste JSON structures seamlessly.
- **Undo/Redo**: Full history support for all operations.
- **Validation**: Integrated Zod validation to ensure data integrity.

### 🎨 UI/UX
- **Responsive Design**: Fully optimized for both desktop and mobile devices.
- **Dark/Light Mode**: Built-in theme switching support.
- **Modern Components**: Built with Radix UI and Shadcn UI for accessible and polished interactions.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Utilities**: [Lodash](https://lodash.com/), [Zod](https://zod.dev/), [clsx](https://github.com/lukeed/clsx)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/crimson-voyager.git
   cd crimson-voyager
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage Guide

### Hotkeys

| Key Combination | Action |
|----------------|--------|
| `Ctrl/Cmd + C` | Copy selected node(s) |
| `Ctrl/Cmd + X` | Cut selected node(s) |
| `Ctrl/Cmd + V` | Paste from clipboard |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Delete` | Delete selected node(s) |

### Tree View Interactions

- **Expand/Collapse**: Click the arrow icon next to objects/arrays.
- **Select**: Click a node to select. Hold `Ctrl/Cmd` to toggle selection. Hold `Shift` to select a range.
- **Edit**: Click the edit icon (pencil) or double-click a value to modify it.
- **Add Item**: Click the plus icon (+) on an object or array to add a child item.
- **Reorder**: Drag a node and drop it onto a sibling to reorder.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
