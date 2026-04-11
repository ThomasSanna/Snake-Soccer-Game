import { C2S_Input } from "@cursor-soccer/shared";

/**
 * Bufferizes inputs to allow Client-Side Prediction (CSP).
 * Stores inputs until they form a part of a server snapshot. 
 */
export class InputBuffer {
  private queue: C2S_Input[] = [];
  private sequenceNumber = 0;

  addInput(mouseX: number, mouseY: number, sprint: boolean, anchor: boolean): C2S_Input {
    this.sequenceNumber++;
    const input: C2S_Input = {
      type: "input",
      seq: this.sequenceNumber,
      mouseX,
      mouseY,
      sprint,
      anchor,
    };
    this.queue.push(input);
    return input;
  }

  ack(sequenceNumber: number) {
    this.queue = this.queue.filter((i) => i.seq > sequenceNumber);
  }

  getPendingInputs(): C2S_Input[] {
    return this.queue;
  }

  clear() {
    this.queue = [];
    this.sequenceNumber = 0;
  }
}
