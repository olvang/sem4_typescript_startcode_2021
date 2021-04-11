import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import friendRoutes from './routes/friendRoutesAuth';
import cors from 'cors';
import simpleLogger from './middleware/simpleLogger';
import basicAuth from './middleware/basic-auth';
import logger, { stream } from './middleware/logger';
import { ApiError } from './errors/errors';
const app = express();

//app.use(simpleLogger);
app.set('logger', logger);

const morganFormat = process.env.NODE_ENV == 'production' ? 'combined' : 'dev';
app.use(require('morgan')(morganFormat, { stream }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));

app.use('/api/friends', basicAuth, cors(), friendRoutes);

app.get('/demo', (req, res) => {
  res.send('Server is up');
});

app.use('/api', (req, res, next) => {
  res.status(404).json({ errorCode: 404, msg: "Sorry can't find that!" });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApiError) {
    const errorCode = err.errorCode ? err.errorCode : 500;
    res.status(errorCode).json(new ApiError(err.message, errorCode));
  } else {
    next(err);
  }
});

export default app;
