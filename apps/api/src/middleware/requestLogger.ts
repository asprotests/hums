import morgan from 'morgan';
import type { StreamOptions } from 'morgan';

const stream: StreamOptions = {
  write: (message: string) => {
    // Remove newline at end
    console.info(message.trim());
  },
};

const skip = () => {
  return process.env.NODE_ENV === 'test';
};

const format = process.env.NODE_ENV === 'production'
  ? 'combined'
  : ':method :url :status :res[content-length] - :response-time ms';

export const requestLogger = morgan(format, { stream, skip });
