import Time from "./Time.js"
import Renderer from "./Renderer.js"
import * as ui from "./util-ui.js"

export default class App {
    renderer = new Renderer();
    time = new Time();

    constructor() {
        // create keyboard shortcuts and anything that opperates on whole App
        this.setupGlobalHandlers();

        // create the HTML UI
        this.createUI(document.getElementById("ui"));

        // load settings/src from user's localStorage. will set defaults if none found.
        this.load();

        // compile the shader program
        this.renderer.compile();

        // start the run loop
        this.loop(0);
    }

    get uiShowing() {
        return (document.getElementById("ui").classList.contains("hidden") === false);
    }

    toggleUI() {
        document.getElementById("ui").classList.toggle("hidden");
    }

    toggleRun() {
        this.time.isRunning = !this.time.isRunning;
        this.time.printStatus();
    }

    setupGlobalHandlers() {
        window.addEventListener("keydown", e => {
            if (e.shiftKey || e.altKey) {
                return;
            }
            // cmd+s, save/recompile
            else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                this.save();
                e.preventDefault();
            }
            // cmd+e, toggle ui
            else if (e.key === "e" && (e.metaKey || e.ctrlkey)) {
                this.toggleUI();
                e.preventDefault();
            }
        });
    }

    loop(eventTime) {
        // time
        this.time.update(eventTime);

        // advance sim
        this.tick();

        // draw
        this.renderer.draw();

        // next loop
        requestAnimationFrame(this.loop.bind(this));
    }

    tick() {
        if (!this.time.isRunning) {
            return;
        }
        // console.log("global", this.time.global, this.time.dt);
        // console.log("now", this.time.now);
    }

    load() {
        this.renderer.prog.vert.load();
        this.renderer.prog.frag.load();
    }

    save() {
        console.log("SAVE START -----------------------------------------------------")
        // compile shaders
        this.renderer.compile();
        // update vertex data from ui
        this.renderer.pass.updateDataFromUI();
        // save shader src to localStorage
        this.renderer.prog.vert.save();
        this.renderer.prog.frag.save();
        console.log("------------------------------------------------------- SAVE END");
    }

    createUI(parentEl) {
        this.renderer.createUI(parentEl);
        // adds systematic handlers, etc
        ui.parse(parentEl);
    }
}
