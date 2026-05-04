import type { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/lib/types';
import { initSocketServer } from '@/lib/socket';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    // adapt Next's internal http server to the socket.io server
    initSocketServer(res.socket.server);
  }
  res.end();
};

export default ioHandler;
