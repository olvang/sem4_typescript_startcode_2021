import { Router } from 'express';
import { ApiError } from '../errors/errors';
import facade from '../facades/DummyDB-Facade';
import { IFriend } from '../interfaces/IFriend';
const router = Router();

router.get('/', async (req, res) => {
  const friends = await facade.getAllFriends();
  const friendsDTO = friends.map((friend) => {
    const { firstName, lastName, email } = friend;
    return { firstName, lastName, email };
  });
  res.json(friendsDTO);
});

router.get('/:userid', async (req, res, next) => {
  const userId = req.params.userid;

  try {
    if (!userId) throw new ApiError('userId not given', 400);

    const friend = await facade.getFriendById(userId);
    if (friend) {
      const { firstName, lastName, email } = friend;
      const friendDTO = { firstName, lastName, email };
      return res.json(friendDTO);
    }

    throw new ApiError('User not found with id: ' + userId, 404);
  } catch (error) {
    next(error);
  }
});

router.get('/findby-email/:email', async (req, res, next) => {
  const { email } = req.params;
  try {
    if (!email) throw new ApiError('Email not given', 400);
    const friend = await facade.getFriend(email);
    if (friend) {
      const { firstName, lastName } = friend;
      return res.json({ firstName, lastName, email });
    }
    throw new ApiError('User not found with email: ' + email, 404);
  } catch (error) {
    next(error);
  }
});

router.post('/friends', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const newFriend: IFriend = {
    id: '',
    firstName,
    lastName,
    email,
    password,
  };
  const friend = await facade.addFriend(newFriend);
  res.json(friend);
});

router.delete('/:email', async (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(404).send();
  try {
    await facade.deleteFriend(email);
  } catch (error) {
    res.json(error);
  }

  res.status(200);
});

export default router;
