document.addEventListener('DOMContentLoaded', () => {
    // Səhifə elementlərini seçirik
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const kreditFormu = document.getElementById('kreditFormu');
    const musteriCedveli = document.getElementById('musteriCedveli');
    const searchBox = document.getElementById('searchBox');

    // Modal Pəncərə Elementləri
    const odenisModal = document.getElementById('odenisModal');
    const cekModal = document.getElementById('cekModal');
    const closeOdenisModal = document.getElementById('closeOdenisModal');
    const closeCekModal = document.getElementById('closeCekModal');
    const odenisFormu = document.getElementById('odenisFormu');
    const printCekBtn = document.getElementById('printCekBtn');

    // Lokal yaddaşdan müştəriləri yükləyirik
    let musteriler = JSON.parse(localStorage.getItem('musteriler')) || [];

    // Menyu naviqasiyası
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Yeni kredit forması təsdiqlənəndə
    kreditFormu.addEventListener('submit', (e) => {
        e.preventDefault();

        // Növbəti ödəniş tarixini təyin edirik (indiki tarixdən 1 ay sonra)
        const ilkOdenisTarixi = new Date();
        ilkOdenisTarixi.setMonth(ilkOdenisTarixi.getMonth() + 1);

        const yeniMusteri = {
            id: Date.now(),
            ad: document.getElementById('ad').value,
            soyad: document.getElementById('soyad').value,
            ataAdi: document.getElementById('ataAdi').value,
            finKod: document.getElementById('finKod').value.toUpperCase(),
            vesiqeSeria: document.getElementById('vesiqeSeria').value,
            nomreler: [
                document.getElementById('mobil1').value,
                document.getElementById('mobil2').value,
                document.getElementById('mobil3').value,
                document.getElementById('mobil4').value
            ],
            mehsulAdi: document.getElementById('mehsulAdi').value,
            mehsulKateqoriya: document.getElementById('mehsulKateqoriya').value,
            kreditQiymeti: parseFloat(document.getElementById('kreditQiymeti').value),
            ilkinOdenis: parseFloat(document.getElementById('ilkinOdenis').value),
            kreditMuddeti: parseInt(document.getElementById('kreditMuddeti').value),
            qaliqAylar: parseInt(document.getElementById('kreditMuddeti').value),
            novbetiOdenisTarixi: ilkOdenisTarixi.toISOString().split('T')[0], // YYYY-MM-DD formatında
            odenisTarixcesi: []
        };

        musteriler.push(yeniMusteri);
        saveAndRender();
        kreditFormu.reset();
        alert('Yeni kredit uğurla əlavə edildi!');
    });
    
    // Axtarış funksionallığı
    searchBox.addEventListener('keyup', () => {
        renderMusteriler();
    });

    // Əməliyyatlar (Ödəniş və Silmə)
    musteriCedveli.addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('tr')?.dataset.id);
        if (e.target.classList.contains('pay-btn')) {
            openOdenisModal(id);
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Bu müştərini və bütün kredit məlumatlarını silməyə əminsiniz?')) {
                musteriler = musteriler.filter(m => m.id !== id);
                saveAndRender();
            }
        }
    });
    
    // Ödəniş modalını açmaq
    function openOdenisModal(id) {
        const musteri = musteriler.find(m => m.id === id);
        if (!musteri || musteri.qaliqAylar === 0) {
            alert("Bu müştərinin borcu yoxdur və ya artıq ödənilib.");
            return;
        }
        document.getElementById('modalMusteriAdi').textContent = `${musteri.ad} ${musteri.soyad}`;
        
        const qaliqBorc = musteri.kreditQiymeti - musteri.ilkinOdenis - musteri.odenisTarixcesi.reduce((acc, curr) => acc + curr.mebleg, 0);
        const ayliqOdenis = (qaliqBorc / musteri.qaliqAylar).toFixed(2);
        
        document.getElementById('modalAyliqOdenis').textContent = ayliqOdenis;
        document.getElementById('modalMusteriId').value = id;
        odenisModal.style.display = 'block';
    }

    // Ödəniş forması təsdiqləndə
    odenisFormu.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('modalMusteriId').value);
        const musteri = musteriler.find(m => m.id === id);
        const odenisUsulu = document.getElementById('odenisUsulu').value;

        const umumiBorc = musteri.kreditQiymeti - musteri.ilkinOdenis;
        const odenilmis = musteri.odenisTarixcesi.reduce((acc, curr) => acc + curr.mebleg, 0);
        const qaliqBorc = umumiBorc - odenilmis;
        const ayliqOdenis = qaliqBorc / musteri.qaliqAylar;

        musteri.qaliqAylar -= 1;
        
        const novbetiOdenis = new Date(musteri.novbetiOdenisTarixi);
        novbetiOdenis.setMonth(novbetiOdenis.getMonth() + 1);
        musteri.novbetiOdenisTarixi = novbetiOdenis.toISOString().split('T')[0];
        
        const yeniOdenis = {
            tarix: new Date().toISOString(),
            mebleg: parseFloat(ayliqOdenis.toFixed(2)),
            usul: odenisUsulu
        };
        musteri.odenisTarixcesi.push(yeniOdenis);
        
        saveAndRender();
        odenisModal.style.display = 'none';

        // Çeki göstəririk
        openCekModal(musteri, yeniOdenis);
    });
    
    function openCekModal(musteri, odenis) {
        const umumiBorc = musteri.kreditQiymeti - musteri.ilkinOdenis;
        const odenilmis = musteri.odenisTarixcesi.reduce((acc, curr) => acc + curr.mebleg, 0);
        
        document.getElementById('cekTarix').textContent = new Date(odenis.tarix).toLocaleString('az-AZ');
        document.getElementById('cekMusteriAdi').textContent = `${musteri.ad} ${musteri.soyad}`;
        document.getElementById('cekOdenenMebleg').textContent = odenis.mebleg.toFixed(2);
        document.getElementById('cekOdenisUsulu').textContent = odenis.usul;
        document.getElementById('cekQaliqBorc').textContent = (umumiBorc - odenilmis).toFixed(2);
        document.getElementById('cekQaliqAylar').textContent = musteri.qaliqAylar;
        
        cekModal.style.display = 'block';
    }
    
    printCekBtn.addEventListener('click', () => {
        window.print();
    });


    // Modal pəncərələri bağlamaq
    closeOdenisModal.onclick = () => odenisModal.style.display = 'none';
    closeCekModal.onclick = () => cekModal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == odenisModal) odenisModal.style.display = 'none';
        if (event.target == cekModal) cekModal.style.display = 'none';
    }


    // Məlumatları lokal yaddaşa yazmaq və cədvəli yeniləmək
    function saveAndRender() {
        localStorage.setItem('musteriler', JSON.stringify(musteriler));
        renderMusteriler();
    }

    // Müştəriləri cədvəldə göstərmək
    function renderMusteriler() {
        musteriCedveli.innerHTML = '';
        const searchTerm = searchBox.value.toLowerCase();
        
        const filteredMusteriler = musteriler.filter(m => 
             m.ad.toLowerCase().includes(searchTerm) ||
             m.soyad.toLowerCase().includes(searchTerm) ||
             m.finKod.toLowerCase().includes(searchTerm)
        );

        if (filteredMusteriler.length === 0) {
            musteriCedveli.innerHTML = `<tr><td colspan="8" style="text-align:center;">Məlumat tapılmadı.</td></tr>`;
            return;
        }

        filteredMusteriler.forEach(musteri => {
            if (musteri.qaliqAylar <= 0) return; // Borcu bitənləri göstərmirik

            const umumiBorc = musteri.kreditQiymeti - musteri.ilkinOdenis;
            const odenilmis = musteri.odenisTarixcesi.reduce((acc, curr) => acc + curr.mebleg, 0);
            const qaliqBorc = umumiBorc - odenilmis;
            const ayliqOdenis = (qaliqBorc / musteri.qaliqAylar).toFixed(2);
            
            const { statusClass, statusText } = getStatus(musteri.novbetiOdenisTarixi);

            const tr = document.createElement('tr');
            tr.dataset.id = musteri.id;
            tr.innerHTML = `
                <td><span class="status-indicator ${statusClass}" title="${statusText}"></span></td>
                <td>${musteri.ad} ${musteri.soyad} ${musteri.ataAdi}</td>
                <td>${musteri.mehsulAdi}</td>
                <td>${ayliqOdenis} AZN</td>
                <td>${qaliqBorc.toFixed(2)} AZN</td>
                <td>${musteri.qaliqAylar}</td>
                <td>${new Date(musteri.novbetiOdenisTarixi).toLocaleDateString('az-AZ')}</td>
                <td>
                    <button class="action-btn pay-btn"><i class="fas fa-hand-holding-usd"></i> Ödə</button>
                    <button class="action-btn delete-btn"><i class="fas fa-trash-alt"></i> Sil</button>
                </td>
            `;
            musteriCedveli.appendChild(tr);
        });
    }
    
    // Müştəri statusunu (gecikmə və s.) təyin edən funksiya
    function getStatus(novbetiOdenis) {
        const buGun = new Date();
        const odenisTarixi = new Date(novbetiOdenis);
        buGun.setHours(0,0,0,0);
        odenisTarixi.setHours(0,0,0,0);

        const ferq = odenisTarixi.getTime() - buGun.getTime();
        const ferqGun = Math.ceil(ferq / (1000 * 3600 * 24));
        
        if (ferqGun < 0) {
            return { statusClass: 'status-gecikir', statusText: 'Gecikmə' };
        } else if (ferqGun === 0) {
            return { statusClass: 'status-bugun', statusText: 'Bu gün' };
        } else if (ferqGun <= 5) { // 5 gün və daha az qalıbsa
            return { statusClass: 'status-yaxinlasir', statusText: 'Yaxınlaşır' };
        } else {
            return { statusClass: 'status-normal', statusText: 'Vaxtında' };
        }
    }


    // Proqram ilk açılanda müştəri bazasını göstər
    renderMusteriler();
});
