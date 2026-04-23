// Dev orchestrator: runs the content watcher and Parcel dev server in
// parallel, cleaning both up when either exits. Avoids the orphaned-watcher
// behavior of plain `cmd1 & cmd2` shell backgrounding.
import { join } from "path"

const root = new URL("..", import.meta.url).pathname
const parcelBin = join(root, "node_modules", ".bin", "parcel")

const watcher = Bun.spawn(["bun", "run", "scripts/build-content.ts", "--watch"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
})
const parcel = Bun.spawn([parcelBin, "serve"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
})

let shuttingDown = false
function shutdown(code: number = 0): void {
    if (shuttingDown) return
    shuttingDown = true
    watcher.kill()
    parcel.kill()
    process.exit(code)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

// Exit together: if either child exits, tear down the other.
Promise.race([
    watcher.exited.then(() => "watcher"),
    parcel.exited.then(() => "parcel"),
]).then(which => {
    console.error(`[${which}] exited; shutting down the other.`)
    shutdown(1)
})
