import { ImageSourcePropType } from 'react-native';

// These are specific editions, not generic book photos. See assets/images/books/SOURCES.md.
const covers: { titles: string[]; author: string; source: ImageSourcePropType }[] = [
  { titles: ['Madol Doova', 'Madol Duwa'], author: 'Martin Wickramasinghe', source: require('../../assets/images/books/madol-doova.jpg') },
  { titles: ['Amba Yahaluwo', 'Amba Yaluwo'], author: 'T. B. Ilangaratne', source: require('../../assets/images/books/amba-yahaluwo.jpg') },
  { titles: ['Sapiens', 'Sapiens: A Brief History of Humankind'], author: 'Yuval Noah Harari', source: require('../../assets/images/books/sapiens.jpg') },
  { titles: ['The Seven Moons of Maali Almeida'], author: 'Shehan Karunatilaka', source: require('../../assets/images/books/seven-moons.jpg') },
  { titles: ['Pride and Prejudice'], author: 'Jane Austen', source: require('../../assets/images/books/pride-and-prejudice.jpg') },
  { titles: ['The Hobbit'], author: 'J. R. R. Tolkien', source: require('../../assets/images/books/hobbit.jpg') },
  { titles: ['Atomic Habits'], author: 'James Clear', source: require('../../assets/images/books/atomic-habits.jpg') },
  { titles: ['The Alchemist'], author: 'Paulo Coelho', source: require('../../assets/images/books/alchemist.jpg') },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function getBookCover(title: string, author: string): ImageSourcePropType | undefined {
  return covers.find((book) => normalize(book.author) === normalize(author)
    && book.titles.some((candidate) => normalize(candidate) === normalize(title)))?.source;
}

export function isUsableCoverUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url.trim()) && !/via\.placeholder\.com|placehold\.co/i.test(url);
}
