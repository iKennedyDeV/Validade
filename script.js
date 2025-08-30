document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('productForm');
    const tableBody = document.querySelector('#productTable tbody');
    const generateFileButton = document.getElementById('generateFile');
    const clearTableButton = document.getElementById('clearTable');
    const removeLastButton = document.getElementById('removeLast');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmClearButton = document.getElementById('confirmClearTable');
    const cancelClearButton = document.getElementById('cancelClearTable');
    const validityInput = document.getElementById('validity');
    const identifierInput = document.getElementById('identifier');

    let products = JSON.parse(localStorage.getItem('products')) || [];
    let produtosJSON = [];

    // Máscara automática para validade
    validityInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 4) {
            value = value.slice(0, 2) + (value.length > 2 ? '/' + value.slice(2) : '');
        } else if (value.length <= 6) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4);
        }
        e.target.value = value;
    });

    // 🔹 Carregar JSON no novo formato
    async function loadProdutos() {
        try {
            const response = await fetch('produtos.json');
            if (!response.ok) throw new Error('Erro ao carregar o arquivo JSON');
            const jsonData = await response.json();
            produtosJSON = jsonData.map(item => ({
                CODIGO: String(item["CODIGO"]).trim(),
                COD_BARRAS: String(item["COD BARRAS"]).trim(),
                DESCRICAO: item["DESCRICAO"] || "",
                FABRICANTE: item["FABRICANTE"] || "",
                MARCA: item["MARCA"] || "",
                CUSTO_UNIT: item["CUSTO UNIT."] || "0",
                PRECO: item["PRECO"] || "0"
            }));
        } catch (error) {
            console.error('Erro ao carregar os dados do JSON:', error);
        }
    }
    loadProdutos();

    function updateTable() {
        tableBody.innerHTML = '';
        products.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${product.identifier}</td><td>${product.quantity}</td><td>${product.validity || '-'}</td>`;
            row.dataset.index = index;
            tableBody.appendChild(row);
        });
    }
    updateTable();

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const identifier = String(document.getElementById('identifier').value).trim();
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        const validity = document.getElementById('validity').value.trim();

        const isMMYY = /^\d{2}\/\d{2}$/.test(validity);
        const isDDMMYY = /^\d{2}\/\d{2}\/\d{2}$/.test(validity);

        if (validity && !(isMMYY || isDDMMYY)) {
            alert('Formato de validade inválido. Use MM/AA ou DD/MM/AA.');
            return;
        }

        const existingProduct = products.find(product => product.identifier === identifier);

        if (existingProduct) {
            existingProduct.quantity += quantity;
            existingProduct.validity = validity;
        } else {
            products.push({ identifier, quantity, validity });
        }

        localStorage.setItem('products', JSON.stringify(products));
        updateTable();
        form.reset();
        document.getElementById('identifier').focus();
    });

    // 🔹 Geração de CSV adaptado ao novo JSON
    generateFileButton.addEventListener('click', function () {
        try {
            // Nova ordem: Codigo;Descricao;Codigo de Barras;Validade;Marca;Quantidade;Custo Unit.;Preco;Qtd/Valor
            let fileContent = 'Codigo;Descricao;Codigo de Barras;Validade;Marca;Quantidade;Custo Unit.;Preco;Qtd/Valor\n';
            let totalQuantidade = 0;
            let totalCusto = 0;
            let totalPreco = 0;
            let totalValor = 0;

            products.forEach(product => {
                const identifier = product.identifier;
                const matchingProduct = produtosJSON.find(item =>
                    item.COD_BARRAS === identifier || item.CODIGO === identifier
                );

                let validadeFormatada = product.validity || '-';
                if (/^\d{2}\/\d{2}$/.test(validadeFormatada)) {
                    validadeFormatada = '30/' + validadeFormatada;
                }

                if (matchingProduct) {
                    const custo = parseFloat(matchingProduct.CUSTO_UNIT.toString().replace(',', '.')) || 0;
                    const preco = parseFloat(matchingProduct.PRECO.toString().replace(',', '.')) || 0;
                    const total = preco * product.quantity;

                    const custoFormatado = custo.toFixed(2).replace('.', ',');
                    const precoFormatado = preco.toFixed(2).replace('.', ',');
                    const totalFormatado = total.toFixed(2).replace('.', ',');

                    fileContent += `${matchingProduct.CODIGO};${matchingProduct.DESCRICAO};${matchingProduct.COD_BARRAS};${validadeFormatada};${matchingProduct.MARCA};${product.quantity};${custoFormatado};${precoFormatado};${totalFormatado}\n`;

                    totalQuantidade += product.quantity;
                    totalCusto += custo;
                    totalPreco += preco;
                    totalValor += total;
                } else {
                    let codigo = '-';
                    let barras = '-';
                    const isCodigoBarras = identifier.length >= 8 && /^\d+$/.test(identifier);
                    if (isCodigoBarras) {
                        barras = identifier;
                    } else {
                        codigo = identifier;
                    }
                    fileContent += `${codigo};-;${barras};${validadeFormatada};-;${product.quantity};-;-;-\n`;

                    totalQuantidade += product.quantity;
                }
            });

            // Linha de totais
            fileContent += `TOTAL;-;-;-;-;${totalQuantidade};${totalCusto.toFixed(2).replace('.', ',')};${totalPreco.toFixed(2).replace('.', ',')};${totalValor.toFixed(2).replace('.', ',')}\n`;

            const blob = new Blob([fileContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'produtos.csv';
            link.click();
        } catch (error) {
            console.error('Erro ao gerar o arquivo CSV:', error);
            alert('Ocorreu um erro ao gerar o arquivo CSV. Verifique o console para mais informações.');
        }
    });

    clearTableButton.addEventListener('click', function () {
        confirmationModal.style.display = 'block';
    });

    cancelClearButton.addEventListener('click', function () {
        confirmationModal.style.display = 'none';
    });

    confirmClearButton.addEventListener('click', function () {
        products = [];
        localStorage.removeItem('products');
        updateTable();
        confirmationModal.style.display = 'none';
    });

    removeLastButton.addEventListener('click', function () {
        if (products.length > 0) {
            products.pop();
            localStorage.setItem('products', JSON.stringify(products));
            updateTable();
        }
    });

    tableBody.addEventListener('click', function(event) {
        const row = event.target.closest('tr');
        if (!row) return;
        const index = parseInt(row.dataset.index, 10);
        if (isNaN(index)) return;

        const product = products[index];
        document.getElementById('identifier').value = product.identifier;
        document.getElementById('quantity').value = product.quantity;
        document.getElementById('validity').value = product.validity || '';
        products.splice(index, 1);
        localStorage.setItem('products', JSON.stringify(products));
        updateTable();
    });

    // 🔹 Compatibilidade HID (modo teclado)
    identifierInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.requestSubmit();
        }
    });

    // 🔹 Compatibilidade Broadcast/Message (modo novo)
    window.addEventListener("message", function(event) {
        if (event.data && event.data.barcode) {
            identifierInput.value = event.data.barcode;
            form.requestSubmit();
        }
    });
});
