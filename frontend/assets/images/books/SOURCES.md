# Book cover sources

Retrieved and visually checked on 23 November 2026. These are covers of published books, not generated artwork. Each JPEG is bundled by Metro for Android, iOS, and web. Combined size is approximately 327 KiB.

- `madol-doova.jpg`: Martin Wickramasinghe, **Madol Doova**, English edition, ISBN 9789556950076. [Official author bookshop](https://shop.martinwickramasinghe.com/product/madol-doova/), [image](https://shop.martinwickramasinghe.com/wp-content/uploads/2023/09/Madol-E-300x450.jpg).
- `amba-yahaluwo.jpg`: T. B. Ilangaratne, **Amba Yahaluwo**, ISBN 9789555730587. [Open Library image](https://covers.openlibrary.org/b/isbn/9789555730587-L.jpg?default=false).
- `sapiens.jpg`: Yuval Noah Harari, **Sapiens: A Brief History of Humankind**, ISBN 9780062316097. [Open Library image](https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg?default=false).
- `seven-moons.jpg`: Shehan Karunatilaka, **The Seven Moons of Maali Almeida**, ISBN 9781908745903. [Open Library image](https://covers.openlibrary.org/b/isbn/9781908745903-L.jpg?default=false).
- `pride-and-prejudice.jpg`: Jane Austen, **Pride and Prejudice**, ISBN 9780141439518. [Open Library image](https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg?default=false).
- `hobbit.jpg`: J. R. R. Tolkien, **The Hobbit**, ISBN 9780261103344. [Open Library image](https://covers.openlibrary.org/b/isbn/9780261103344-L.jpg?default=false).
- `atomic-habits.jpg`: James Clear, **Atomic Habits**, ISBN 9780735211292. [Open Library image](https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg?default=false).
- `alchemist.jpg`: Paulo Coelho, **The Alchemist**, ISBN 9780061122415. [Open Library image](https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg?default=false).

Open Library's [Covers API](https://openlibrary.org/dev/docs/api/covers) provides edition images by ISBN. Cover artwork belongs to its respective rights holders; availability through a public API does not establish an unrestricted redistribution license. No ownership or license to this artwork is claimed by this repository.

## Display behavior

`src/data/bookCovers.ts` matches normalized title **and author** to prevent assigning unrelated artwork. Known legacy Amazon, Goodreads, Open Library, and official-author-shop URLs use the bundled edition. Custom uploaded URLs take priority, falling back to the matching bundled edition on failure. Unknown books with missing or failed images show a labeled, themed empty cover rather than a different book's artwork.

Book cards show the title and author below the image and use `contain` so artwork is not cropped. The same component handles details and inventory thumbnails. Add a JPEG, source entry, and static `require` mapping to support another title. A matching cover represents an illustrative edition; this project does not currently store ISBNs or edition metadata per inventory record.

The demo owner now receives four real titles with sample prices and inventory. Existing known catalog titles gain cover fallback immediately without database changes. For older fictional demo fixtures, run `node scripts/refresh-demo-books.js` from `backend` to preview a targeted upgrade; add `--apply` to perform it. The script checks demo ownership, exact original fixture fields, missing covers, and absence of orders/reviews, then conditionally updates the original record. Edited fixtures and real inventory are excluded. The seed file has updated image URLs, but it deletes data before seeding: do not run it against a real database to apply this change.
