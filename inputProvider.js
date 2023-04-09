/**
 * provide and record input in the form of keys currently pressed, whether the mouse is pressed, and where the mouse is
 * optionally provide a frame number
 */

class InputManager {
    constructor(givenReplayData=null){
        /**
        {
            gameVersion: string,
            startingTime: number,   // (unix ms)
            seed: number,
            inputs[]: {    // indexed by gameFrame 
                keysPressed: [], 
                isMousePressed: boolean, 
                mousePosition: { x: number, y: number }
            }
        }
        */
        this.givenReplayData = givenReplayData;
        this.generatedReplayData = {
            version: VERSION,
            startingTime: Date.now(),
            seed: gameSeed,
            inputs: []
        }
    }

    /**
    returns:
    {
        mouseIsPressed: boolean
        mousePosition: { x: number, y: number }
        keyCodesPressed: number[]
    }
     */
    getCurrentInputs(frame) {
        if (this.givenReplayData){
            return this.givenReplayData[frame];
        }
        else{
            const keyCodesPressed = [];
            for (let i = 0; i < 255; i++) {
                if (keyIsDown(i)){
                    keyCodesPressed.push(i);
                }
            }
        
            const inputs = {
                mouseIsPressed: mouseIsPressed,
                mousePosition: { x: mouseX, y: mouseY },
                keyCodesPressed: keyCodesPressed
            }

            this.generatedReplayData[frame] = inputs;
            return inputs;
        }
    }
}