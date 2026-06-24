class BatchRequestManager {
  constructor(batchSize = 5, delayMs = 100) {
    this.queue = [];
    this.batchSize = batchSize;
    this.delayMs = delayMs;
    this.processing = false;
  }

  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      try {
        const results = await Promise.all(
          batch.map(({ request }) => request())
        );
        
        batch.forEach(({ resolve }, index) => {
          resolve(results[index]);
        });
      } catch (error) {
        batch.forEach(({ reject }) => {
          reject(error);
        });
      }

      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }

    this.processing = false;
  }
}

export const requestBatcher = new BatchRequestManager();

export function batchRequest(requestFn) {
  return requestBatcher.add(requestFn);
}