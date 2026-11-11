# Zeka Oyunları Alıştırma (3-4. sınıf)

İlkokul 3. ve 4. sınıf zeka oyunları yarışmasına hazırlık için alıştırma sitesi.
Her soru tarayıcıda o an üretilir (sabit soru bankası yok); her bulmacanın tek çözümü olduğu çözücüyle kontrol edilir.

**Oyunlar:** Klasik Sudoku, Ardışık Sudoku, Yerleşmeyen Kelime, Gölge Bulmaca, Tıpatıp Bulmaca, Üstten Görünüş,
Farklı Şekil, ABC Bağlamaca, Amiral Battı, Farklı Komşular, Kendoku, Çit, ABC Kadar Kolay, Hazine Avı
ve finalde eklenen Apartmanlar, Sayı Bulmaca, Tapa, Kakuro.

**Modlar:** animasyonlu "Nasıl oynanır?" dersleri (adım adım, isteğe bağlı sesli anlatım), tek tek alıştırma (Kolay/Orta, kontrol, ipucu, çözüm) ve süreli yarışma provası
(Okul içi: 15 soru / 60 dk, Final: 22+3 soru / 90 dk). Oyun, ders ve prova ekranları tam ekran yapılabilir.

**Eğlence ve gelişim:** çocuğun adı, puan ve seviye, rozetler, kombo, gün serisi, günün bulmacası, konfeti ve sesler. "Gelişimim" sayfasında prova geçmişi, doğru/yanlış/boş ve süre grafiği, önceki ve en iyi provayla karşılaştırma, tür bazında başarı. Veriler yalnızca bu cihazda saklanır; yedek dosyasıyla başka cihaza taşınabilir.

Bağımsız bir alıştırma sitesidir; resmi yarışma sitesi değildir.

## Geliştirme
Derleme gerekmez, statik dosyalardır. Yerel sunucu: `node tools/serve.mjs` → http://localhost:4197
Testler: `node --test tests/generators.test.mjs tests/lessons.test.mjs tests/profile.test.mjs`
