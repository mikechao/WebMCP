# MCP-B Architecture Flow: From Chat to Tool Execution

This diagram shows the complete flow from when a user enters "Add sleep to my todo list" in the extension's chat to the execution of the `addTodo` tool in the vanilla-ts example.

```mermaid
graph TD
    %% User Input
    User[🧑‍💻 User types:<br/>'Add sleep to my todo list'<br/>in extension chat]
    
    %% Extension UI Layer
    ChatUI[📱 Extension Sidepanel<br/>routes/chat.index.tsx<br/>Thread Component]
    AssistantUI[🤖 Assistant UI Runtime<br/>@assistant-ui/react<br/>useChatRuntime hook]
    
    %% Extension Background Layer  
    ExtensionBG[🔧 Extension Background<br/>entrypoints/background/index.ts<br/>McpServer + McpHub]
    Hub[🎯 McpHub<br/>services/mcpHub.ts<br/>Tool registry & routing]
    
    %% Transport Layer
    ExtServerTransport[📡 ExtensionServerTransport<br/>@mcp-b/transports<br/>Port-based messaging]
    ExtClientTransport[📡 ExtensionClientTransport<br/>@mcp-b/transports<br/>Sidepanel to Background]
    
    %% Content Script Layer
    ContentScript[🌐 Content Script<br/>entrypoints/content/index.ts<br/>Bridge between page & extension]
    TabClientTransport[📡 TabClientTransport<br/>@mcp-b/transports<br/>postMessage API]
    
    %% Web Page Layer
    WebPage[🌍 Web Page<br/>examples/vanilla-ts<br/>localhost:5173]
    TabServerTransport[📡 TabServerTransport<br/>@mcp-b/transports<br/>window.postMessage listener]
    McpServerPage[🔧 McpServer<br/>@modelcontextprotocol/sdk<br/>counter.ts]
    AddTodoTool[⚙️ addTodo Tool<br/>counter.ts lines 125-146<br/>Tool implementation]
    
    %% Packages
    TransportsPackage[📦 @mcp-b/transports<br/>packages/transports<br/>Communication layer]
    McpReactHooks[📦 @mcp-b/mcp-react-hooks<br/>packages/mcp-react-hooks<br/>React integration]
    
    %% Flow connections
    User --> ChatUI
    ChatUI --> AssistantUI
    AssistantUI --> ExtClientTransport
    ExtClientTransport --> ExtServerTransport
    ExtServerTransport --> ExtensionBG
    ExtensionBG --> Hub
    
    %% Tool discovery & registration (setup phase)
    ContentScript -.->|discovers tools| TabClientTransport
    TabClientTransport -.->|connects to| TabServerTransport  
    TabServerTransport -.->|exposes| McpServerPage
    McpServerPage -.->|registers| AddTodoTool
    ContentScript -.->|registers tools| ExtensionBG
    Hub -.->|prefixes & caches| ExtServerTransport
    
    %% Tool execution flow
    Hub -->|routes to tab| ContentScript
    ContentScript --> TabClientTransport
    TabClientTransport --> TabServerTransport
    TabServerTransport --> McpServerPage
    McpServerPage --> AddTodoTool
    
    %% Response flow (reverse)
    AddTodoTool -->|result| McpServerPage
    McpServerPage -->|JSON-RPC response| TabServerTransport
    TabServerTransport -->|postMessage| TabClientTransport
    TabClientTransport -->|chrome.runtime| ContentScript
    ContentScript -->|port message| Hub
    Hub -->|tool result| ExtServerTransport
    ExtServerTransport -->|port message| ExtClientTransport
    ExtClientTransport -->|runtime| AssistantUI
    AssistantUI -->|UI update| ChatUI
    ChatUI -->|displays result| User
    
    %% Package dependencies
    ExtClientTransport -.->|uses| TransportsPackage
    ExtServerTransport -.->|uses| TransportsPackage
    TabClientTransport -.->|uses| TransportsPackage
    TabServerTransport -.->|uses| TransportsPackage
    ChatUI -.->|uses| McpReactHooks
    
    %% Styling
    classDef userStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef extensionStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef transportStyle fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef webStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef packageStyle fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef toolStyle fill:#ffebee,stroke:#b71c1c,stroke-width:3px
    
    class User userStyle
    class ChatUI,AssistantUI,ExtensionBG,Hub,ContentScript extensionStyle
    class ExtServerTransport,ExtClientTransport,TabClientTransport,TabServerTransport transportStyle
    class WebPage,McpServerPage webStyle
    class TransportsPackage,McpReactHooks packageStyle
    class AddTodoTool toolStyle
```

## Key Components in the Flow

### 1. Extension Layer (`extension/`)
- **Sidepanel UI**: Chat interface where user types the request
- **Background Service**: Aggregates tools from all tabs and routes requests
- **Content Script**: Bridges between web pages and extension background

### 2. Transport Layer (`packages/transports/`)
- **ExtensionClientTransport**: Sidepanel ↔ Background communication
- **ExtensionServerTransport**: Background serves tools to sidepanel
- **TabClientTransport**: Content script ↔ Web page communication  
- **TabServerTransport**: Web page exposes MCP server

### 3. Web Page Layer (`examples/vanilla-ts/`)
- **MCP Server**: Hosts tools like `addTodo`
- **Tool Implementation**: Actual business logic execution
- **UI Updates**: Visual feedback when tools are called

## Tool Name Translation
- **Original**: `addTodo` (in counter.ts)
- **Extension Registry**: `website_tool_localhost_5173_tab123_addTodo`
- **AI Sees**: Clean name for natural language processing
- **Execution**: Full prefixed name for proper routing

## Communication Protocols
- **Extension Internal**: Chrome runtime Port messaging
- **Cross-Tab**: window.postMessage with origin validation
- **MCP Protocol**: JSON-RPC 2.0 over transport layers
