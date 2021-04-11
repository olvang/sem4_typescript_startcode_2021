import { IFriend } from '../interfaces/IFriend';
import { Db, Collection } from 'mongodb';
import bcrypt from 'bcryptjs';
import { ApiError } from '../errors/errors';
import Joi, { ValidationError } from 'joi';
import logger from '../middleware/logger';

const BCRYPT_ROUNDS = 10;

const USER_INPUT_SCHEMA = Joi.object({
  firstName: Joi.string().min(2).max(40).required(),
  lastName: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(4).max(30).required(),
  email: Joi.string().email().required(),
});

const USER_INPUT_ADMIN_SCHEMA = Joi.object({
  firstName: Joi.string().min(2).max(40).required(),
  lastName: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(4).max(30).required(),
  email: Joi.string().email().required(),
  role: Joi.string()
    .custom((value, helper) => {
      if (!['admin', 'user'].includes(value)) {
        return helper.error('Role must be user or admin');
      }

      return true;
    })
    .required(),
});

class FriendsFacade {
  db: Db;
  friendCollection: Collection;

  constructor(db: Db) {
    this.db = db;
    this.friendCollection = db.collection('friends');
  }

  /**
   *
   * @param friend
   * @throws ApiError if validation fails
   */
  async addFriend(friend: IFriend): Promise<{ id: String }> {
    const status = USER_INPUT_SCHEMA.validate(friend);
    if (status.error) {
      throw new ApiError(status.error.message, 400);
    }
    const hashedpw = await bcrypt.hash(friend.password, BCRYPT_ROUNDS);
    const f = { ...friend, password: hashedpw };

    try {
      const insertedFriend = await this.friendCollection.insertOne(f);
      return { id: insertedFriend.insertedId };
    } catch (error) {
      throw new ApiError('Error while inserting friend to database', 500);
    }
  }

  /**
   * TODO
   * @param email
   * @param friend
   * @throws ApiError if validation fails or friend was not found
   */
  async editFriend(
    email: string,
    friend: IFriend,
    admin: boolean
  ): Promise<{ modifiedCount: number }> {
    let status;
    if (admin) {
      status = USER_INPUT_ADMIN_SCHEMA.validate(friend);
    } else {
      status = USER_INPUT_SCHEMA.validate(friend);
    }
    if (status.error) {
      throw new ApiError(status.error.message, 400);
    }

    const hashedpw = await bcrypt.hash(friend.password, BCRYPT_ROUNDS);
    const f = { ...friend, password: hashedpw };
    let dbFriend: IFriend;
    try {
      //Check if exists
      dbFriend = await this.friendCollection.findOne({
        email,
      });

      if (!dbFriend) {
        throw new ApiError('No user with with email:' + email, 404);
      }
    } catch (error) {
      throw new ApiError('No user with with email:' + email, 404);
    }

    try {
      //Update user
      const updated = await this.friendCollection.updateOne(
        { _id: dbFriend._id },
        { $set: f }
      );

      return { modifiedCount: updated.modifiedCount };
    } catch (error) {
      console.log(error);
      logger.error(error);
      throw new ApiError('Error while updating user', 500);
    }
  }

  /**
   *
   * @param friendEmail
   * @returns true if deleted otherwise false
   */
  async deleteFriend(friendEmail: string): Promise<boolean> {
    let dbFriend;
    try {
      //Check if exists
      dbFriend = await this.friendCollection.findOne({
        email: friendEmail,
      });

      if (!dbFriend) {
        throw new ApiError('No user with email: ' + friendEmail, 404);
      }
    } catch (error) {
      throw new ApiError('No user with email: ' + friendEmail, 404);
    }

    //Delete
    try {
      //Check if exists
      const deletedRes = await this.friendCollection.deleteOne({
        _id: dbFriend._id,
      });

      if (deletedRes?.deletedCount) {
        return deletedRes.deletedCount > 0 ? true : false;
      }
      return false;
    } catch (error) {
      throw new ApiError('Error while removing user', 500);
    }
  }

  async getAllFriends(): Promise<Array<IFriend>> {
    const users: unknown = await this.friendCollection.find({}).toArray();
    return users as Array<IFriend>;
  }

  /**
   *
   * @param friendEmail
   * @returns
   * @throws ApiError if not found
   */
  async getFriend(friendEmail: string): Promise<IFriend> {
    try {
      const friend: IFriend = await this.friendCollection.findOne({
        email: friendEmail,
      });

      if (!friend) {
        throw new ApiError('No user with email: ' + friendEmail, 404);
      }

      return friend;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Error while finding friend in db', 500);
    }
  }

  /**
   * Use this method for authentication
   * @param friendEmail
   * @param password
   * @returns the user if he could be authenticated, otherwise null
   */
  async getVerifiedUser(
    friendEmail: string,
    password: string
  ): Promise<IFriend | null> {
    const friend: IFriend = await this.friendCollection.findOne({
      email: friendEmail,
    });
    if (friend && bcrypt.compare(password, friend.password)) {
      return friend;
    }
    return Promise.resolve(null);
  }
}

export default FriendsFacade;
