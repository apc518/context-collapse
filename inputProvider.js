document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (!InputProvider.pressedKeys.includes(key)) {
        InputProvider.pressedKeys.push(key);
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key;
    const index = InputProvider.pressedKeys.indexOf(key);
    if (index !== -1) {
        InputProvider.pressedKeys.splice(index, 1);
    }
});

window.addEventListener("blur", () => { InputProvider.pressedKeys.splice(0, InputProvider.pressedKeys.length) });

/**
 * provide and record input in the form of keys currently Prs, whether the mouse is Prs, and where the mouse is
 * optionally provide a frame number
 * 
 * replay data is indexed by *game frame* not by real frame.
 * for any game frame with exactly the same inputs as the previous frame there will be no entry. This is mostly just to avoid memory going crazy
 * 
 * current input is provided to the caller of getInputsByGameFrame(frame) in the following format:
 * {
 *   keysPressed: Array<string>,
 *   mouseIsPressed: boolean,
 *   mousePosition: { x: number, y: number }
 * }
 * 
 * internally, the input for each frame will be stored like this:
 * [
 *   mouseX: number,
 *   mouseY: number,
 *   keyPressed1: string, // keys pressed. If no keys are pressed, this item will not be in the list
 *   keyPressed2: string,
 *   keyPressed3: string,
 *   ...
 *   1?,  // whether mouse is pressed. 1 if the mouse is pressed, not present if not (when coerced to boolean, equivalent to true/false)
 * ]
 * 
 * NOTE: for serializing, mouse position is only listed when it has changed since the previous frame
 */
class InputProvider {
    static pressedKeys = [];
    static version = "1.0.0";
    
    constructor(givenReplayData=null){
        this.givenReplayData = givenReplayData;
        this.generatedReplayData = [];
    }

    /**
     * call if in live mode
     */
    _update(frame){
        if (!this.givenReplayData && !this.generatedReplayData[frame]){
            const inputs = [mouseX, mouseY];
            InputProvider.pressedKeys.forEach(k => inputs.push(k));
            if (mouseIsPressed) inputs.push(1);

            this.generatedReplayData[frame] = inputs;
        }
    }

    _convertInputs(internalInputs){
        let numKeysPressed = 0;
        for (let i = 2; i < internalInputs.length; i++){
            if (typeof internalInputs[i] === "string"){
                numKeysPressed += 1;
            }
        }

        return {
            mousePosition: { x: internalInputs[0], y: internalInputs[1] },
            keysPressed: internalInputs.slice(2, 2 + numKeysPressed),
            mouseIsPressed: internalInputs.length > 2 && internalInputs[internalInputs.length - 1] === 1,
        }
    }

    /*
    returns:
    {
        mouseIsPressed: boolean
        mousePosition: { x: number, y: number }
        keysPressed: Array<string>
    }
     */
    getInputsByGameFrame(frame) {
        this._update(frame);
        const internalInputs = this.givenReplayData ? this.givenReplayData[frame] : this.generatedReplayData[frame];
        return this._convertInputs(internalInputs);
    }

    /*
    Tells which keys/mouse were pressed this frame while not in the previous frame, aka had a press event this frame

    returns:
    {
        mouse: boolean,
        keys: Array<string>
    }
    */
    getPressEventsByGameFrame(frame){
        this._update(frame);

        const replayData = this.givenReplayData ? this.givenReplayData : this.generatedReplayData;
        if (!replayData[frame - 1]) return {
            mouseClick: false, keys: []
        }

        const currentInputs = this._convertInputs(replayData[frame]);
        const prevInputs = this._convertInputs(replayData[frame - 1]);

        const newKeys = [];
        for (const k of currentInputs.keysPressed){
            if (!prevInputs.keysPressed.includes(k)){
                newKeys.push(k);
            }
        }

        return {
            mouse: !prevInputs.mouseIsPressed && currentInputs.mouseIsPressed,
            keys: newKeys
        }
    }
}