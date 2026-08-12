# VHS tape — regenerate: `vhs docs/assets/demo.tape` from repo root
# https://github.com/charmbracelet/vhs
Output docs/assets/demo.gif
Set FontSize 16
Set Width 980
Set Height 560
Set Theme "Catppuccin Mocha"
Set Padding 18
Set WindowBar Colorful
Set TypingSpeed 28ms
Set Shell bash

Hide
Type "clear"
Enter
Sleep 200ms
Show

Type "# define once → HTTP + CLI + MCP"
Enter
Sleep 600ms

Type "export APP_API_KEY=dev-key TASKS_STORE_PATH=.data/demo-tasks.json"
Enter
Sleep 200ms

Type "pnpm --filter @trifold-app/cli start -- tasks create 'Portfolio demo' --json"
Enter
Sleep 2.5s

Type "pnpm --filter @trifold-app/cli start -- tasks list --json"
Enter
Sleep 2s

Type "pnpm openapi:import -- examples/tasks/openapi.snapshot.json | head -8"
Enter
Sleep 2s

Type "echo 'MCP tools: tasks_list · tasks_get · tasks_create (curated)'"
Enter
Sleep 1.2s

Type "echo 'Ready: pnpm dev:api · pnpm dev:mcp:http'"
Enter
Sleep 1.5s
