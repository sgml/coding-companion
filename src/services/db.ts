import * as mongoose from 'mongoose';
import {
  IPersistedMemory,
  IRepository,
  IUser,
  PersistedMemory,
  Repository,
  User,
} from '../models';
import { ConfigService } from './';

class Db {
  public static getInstance(): Db {
    return Db.instance;
  }

  private static instance: Db = new Db();

  constructor(autoConnect: boolean = true) {
    if (Db.instance) {
      throw new Error(
        'Error: Instantiation failed: Use getInstance() instead of new.'
      );
    }

    if (autoConnect && !Db.instance) {
      this.connect();
    }

    Db.instance = this;
  }

  public connect() {
    mongoose.connect(
      `mongodb://localhost:${ConfigService.params.dbPort}/${
        ConfigService.params.dbName
      }`
    );
  }

  public findUser(where: any): Promise<any> {
    return new User().find(where);
  }

  public findMemories(where: any): Promise<any> {
    return new PersistedMemory().find(where);
  }

  public findRepositories(where: any): Promise<any> {
    return new Repository().find(where);
  }

  // TODO: Use model class
  public createUser(data: IUser): Promise<any> {
    data.ack = false;
    data.bookmarks = [];
    data.interests = [];
    const user = new User(data);

    return new Promise((resolve, reject) => {
      user
        .find({
          user: data.user,
          channel: data.channel,
        })
        .then(res => {
          if (res.length === 0) {
            // If not existing
            user
              .save(data)
              .then(saved => {
                resolve(saved);
              })
              .catch(err => {
                reject(err);
              });
          } else {
            // It does already exist
            resolve(false);
          }
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // TODO: Use model class
  public createMemory(data: IPersistedMemory): Promise<any> {
    const memory = new PersistedMemory(data);
    return new Promise((resolve, reject) => {
      memory
        .find({
          channel: data.channel,
          hash: data.hash,
        })
        .then(res => {
          if (res.length === 0) {
            // If not existing
            memory
              .save(data)
              .then(saved => {
                resolve(saved);
              })
              .catch(err => {
                reject(err);
              });
          } else {
            // It does already exist
            resolve(false);
          }
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // TODO: Use model class
  public updateMemory(where: any, data: IPersistedMemory): Promise<any> {
    return new PersistedMemory().update(where, data);
  }

  // TODO: Use model class
  public deleteMemory(hash: string): Promise<any> {
    return new PersistedMemory().remove({ hash });
  }

  // TODO: Use model class
  public createRepository(data: IRepository): Promise<any> {
    const repo = new Repository(data);
    return new Promise((resolve, reject) => {
      repo
        .find({
          url: data.url,
        })
        .then(res => {
          if (res.length === 0) {
            // If not existing
            repo
              .save(data)
              .then(saved => {
                resolve(saved);
              })
              .catch(err => {
                reject(err);
              });
          } else {
            // It does already exist
            resolve(false);
          }
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // TODO: Use model class
  public deleteRepository(url: string) {
    return new Repository().remove({ url });
  }
}

export default Db;
