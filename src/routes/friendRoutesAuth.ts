import { Router } from 'express';
const router = Router();
import { ApiError } from '../errors/errors';
import FriendFacade from '../facades/friendFacade';
const debug = require('debug')('friend-routes');

let facade: FriendFacade;

// Initialize facade using the database set on the application object
router.use(async (req, res, next) => {
  if (!facade) {
    const db = req.app.get('db');
    debug('Database used: ' + req.app.get('db-type'));
    facade = new FriendFacade(db);
  }
  next();
});

// This does NOT require authentication in order to let new users create themself
router.post('/', async function (req, res, next) {
  try {
    let newFriend = req.body;
    const status = await facade.addFriend(newFriend);
    res.json({ status });
  } catch (err) {
    debug(err);
    if (err instanceof ApiError) {
      next(err);
    } else {
      next(new ApiError(err.message, 400));
    }
  }
});

// ALL ENDPOINTS BELOW REQUIRES AUTHENTICATION

import authMiddleware from '../middleware/basic-auth';
const USE_AUTHENTICATION = !process.env['SKIP_AUTHENTICATION'];

if (USE_AUTHENTICATION) {
  router.use(authMiddleware);
}

router.get('/all', async (req: any, res) => {
  const friends = await facade.getAllFriends();

  const friendsDTO = friends.map((friend) => {
    const { firstName, lastName, email } = friend;
    return { firstName, lastName, email };
  });
  res.json(friendsDTO);
});

/**
 * authenticated users can edit himself
 */
router.put('/editme', async function (req: any, res, next) {
  try {
    if (!USE_AUTHENTICATION) {
      throw new ApiError('This endpoint requires authentication', 500);
    }
    const newFriend = req.body;
    const selfEmail = req.credentials.userName;

    const modifiedCountObj = await facade.editFriend(
      selfEmail,
      newFriend,
      false
    );

    res.json(modifiedCountObj);
  } catch (err) {
    debug(err);
    if (err instanceof ApiError) {
      return next(err);
    }
    next(new ApiError(err.message, 400));
  }
});

router.get('/me', async (req: any, res, next) => {
  try {
    if (!USE_AUTHENTICATION) {
      throw new ApiError('This endpoint requires authentication', 500);
    }
    const selfEmail = req.credentials.userName;

    const friend = await facade.getFriend(selfEmail);
    if (friend == null) {
      throw new ApiError('user not found', 404);
    }
    const { firstName, lastName, email } = friend;
    const friendDTO = { firstName, lastName, email };
    res.json(friendDTO);
  } catch (err) {
    next(err);
  }
});

//These endpoint requires admin rights

//An admin user can fetch everyone
router.get('/find-user/:email', async (req: any, res, next) => {
  try {
    if (
      USE_AUTHENTICATION &&
      !req.credentials.role &&
      req.credentials.role !== 'admin'
    ) {
      throw new ApiError('Not Authorized', 401);
    }
    const friendEmail = req.params.email;

    const friend = await facade.getFriend(friendEmail);
    if (friend == null) {
      throw new ApiError('user not found', 404);
    }
    const { firstName, lastName, email, role } = friend;
    const friendDTO = { firstName, lastName, email, role };
    res.json(friendDTO);
  } catch (err) {
    next(err);
  }
});

//An admin user can edit everyone
router.put('/:email', async function (req: any, res, next) {
  try {
    if (
      USE_AUTHENTICATION &&
      !req.credentials.role &&
      req.credentials.role !== 'admin'
    ) {
      throw new ApiError('Not Authorized', 401);
    }

    const email = req.params.email;
    const newFriend = req.body;

    const modifiedCountObj = await facade.editFriend(email, newFriend, true);

    res.json(modifiedCountObj);
  } catch (err) {
    debug(err);
    if (err instanceof ApiError) {
      return next(err);
    }
    next(new ApiError(err.message, 400));
  }
});

//An admin user can delete everyone
router.delete('/:email', async function (req: any, res, next) {
  try {
    if (
      USE_AUTHENTICATION &&
      !req.credentials.role &&
      req.credentials.role !== 'admin'
    ) {
      throw new ApiError('Not Authorized', 401);
    }

    const email = req.params.email;

    const deleted = await facade.deleteFriend(email);

    res.json({ deleted });
  } catch (err) {
    debug(err);
    if (err instanceof ApiError) {
      return next(err);
    }
    next(new ApiError(err.message, 400));
  }
});

export default router;
