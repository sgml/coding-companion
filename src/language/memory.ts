/**
 * TODO: Move everything in the model
 */

import * as _ from 'lodash';
import * as XXH from 'xxhashjs';
import { IPersistedMemory, IUser } from '../models';
import { Db } from '../services';

class LanguageMemory {
  public static getInstance(): LanguageMemory {
    return LanguageMemory.instance;
  }

  private static instance: LanguageMemory = new LanguageMemory();

  private SEED = 0xcafebabe;
  private SHORT_TERM_THRESHOLD = 300000; // 5m
  private LONG_TERM_THRESHOLD = 86400000 * 3; // 3d

  constructor() {
    if (LanguageMemory.instance) {
      throw new Error(
        'Error: Instantiation failed: Use getInstance() instead of new.'
      );
    }

    LanguageMemory.instance = this;

    setInterval(this.forget, this.LONG_TERM_THRESHOLD);
    this.forget();
  }

  public async store(user: IUser, data: string) {
    let memory: any = await this.getMemoryByContent(user, data);

    if (!memory[0]) {
      const now = new Date();
      memory = {
        rawData: data,
        hash: XXH.h32(data, this.SEED).toString(16),
        weight: 0,
        lossCoeff: 0,
        accessDate: now,
        creationDate: now,
        user: user.user,
        channel: user.channel,
      };

      Db.getInstance().createMemory(memory);
    }

    // console.log('------------------');
    // console.log('current memories', this.memories);
    // console.log('------------------');
  }

  public async recall(user: IUser, data: string): Promise<IPersistedMemory> {
    const memory: any = await this.getMemoryByContent(user, data);

    if (memory[0]) {
      const tmpMemory: IPersistedMemory = memory[0];
      const now = new Date();
      tmpMemory.accessDate = new Date();
      tmpMemory.weight += 0.05;
      tmpMemory.lossCoeff = now.getTime() - tmpMemory.creationDate.getTime();

      Db.getInstance().updateMemory(
        {
          channel: tmpMemory.channel,
          hash: tmpMemory.hash,
        },
        tmpMemory
      );

      // console.log('recalled memory', tmpMemory);
    }

    return memory;
  }

  public async isRecent(
    user: IUser,
    data: string,
    isLongTerm: boolean = false
  ): Promise<boolean> {
    const memory: any = await this.getMemoryByContent(user, data);
    let output = false;

    if (memory[0]) {
      const dt = new Date().getTime() - memory[0].creationDate.getTime();
      output = isLongTerm
        ? dt <= this.LONG_TERM_THRESHOLD
        : dt <= this.SHORT_TERM_THRESHOLD;
    }

    // console.log('is "%s" recent = %s', data, output, memory[0]);
    return output;
  }

  private getMemoryByContent(
    user: IUser,
    data: string
  ): Promise<IPersistedMemory> {
    const hash = XXH.h32(data, this.SEED).toString(16);
    return Db.getInstance().findMemories({
      $and: [{ channel: user.channel, hash }],
    });
  }

  private async forget() {
    const memories: IPersistedMemory[] = await Db.getInstance().findMemories(
      {}
    );
    _.each(memories, (memory: IPersistedMemory) => {
      const dt = new Date().getTime() - memory.creationDate.getTime();
      if (dt >= this.LONG_TERM_THRESHOLD) {
        Db.getInstance().deleteMemory(memory.hash);
      }
    });
  }
}

export { LanguageMemory, IPersistedMemory };
