type Emitter = {
  emit: (event: string, payload: unknown) => void;
};

const noopEmitter: Emitter = {
  emit: () => undefined,
};

let io: Emitter = noopEmitter;

export function initSocket(_server?: unknown) {
  io = noopEmitter;
  return io;
}

export function getIO() {
  return io;
}
