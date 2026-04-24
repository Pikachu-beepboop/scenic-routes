import localFont from 'next/font/local';

export const firstFont = localFont({
  // Теперь путь начинается с ./ , так как папка Julius_Sans_One лежит рядом
  src: './Julius_Sans_One/JuliusSansOne-Regular.ttf', 
  weight: '700',
});

export const secondFont = localFont({
  src: './Agbalumo/Agbalumo-Regular.ttf',
  weight: '700',
});

export const thirdFont = localFont({
  src: './colitez-serif/ColitezSerif-Italic.otf',
  weight: '700',
});