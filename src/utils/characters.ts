/**
 * 16 character avatars — shared across all pages.
 * Images are in public/chr/{animal}.png
 */
export interface Character {
  id: number;
  name: string;
  animal: string;
  src: string;
}

export const CHARACTERS: Character[] = [
  { id: 0, name: '곰', animal: 'bear', src: '/chr/bear.png' },
  { id: 1, name: '고양이', animal: 'cat', src: '/chr/cat.png' },
  { id: 2, name: '병아리', animal: 'chick', src: '/chr/chick.png' },
  { id: 3, name: '강아지', animal: 'dog', src: '/chr/dog.png' },
  { id: 4, name: '여우', animal: 'fox', src: '/chr/fox.png' },
  { id: 5, name: '개구리', animal: 'frog', src: '/chr/frog.png' },
  { id: 6, name: '햄스터', animal: 'hamster', src: '/chr/hamster.png' },
  { id: 7, name: '코알라', animal: 'koala', src: '/chr/koala.png' },
  { id: 8, name: '사자', animal: 'lion', src: '/chr/lion.png' },
  { id: 9, name: '수달', animal: 'otter', src: '/chr/otter.png' },
  { id: 10, name: '판다', animal: 'panda', src: '/chr/panda.png' },
  { id: 11, name: '펭귄', animal: 'penguin', src: '/chr/penguin.png' },
  { id: 12, name: '돼지', animal: 'pig', src: '/chr/pig.png' },
  { id: 13, name: '토끼', animal: 'rabbit', src: '/chr/rabbit.png' },
  { id: 14, name: '다람쥐', animal: 'squirrel', src: '/chr/squirrel.png' },
  { id: 15, name: '호랑이', animal: 'tiger', src: '/chr/tiger.png' },
];

/** Get character image src safely */
export function getAvatarSrc(avatarIndex: number): string {
  return CHARACTERS[avatarIndex]?.src || CHARACTERS[0].src;
}
