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

    let products = JSON.parse(localStorage.getItem('products')) || [];
    let produtosJSON = [];

    
    // Máscara automática para validade DD/MM/AA
validityInput.addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length >= 3 && value.length <= 4) {
        value = value.slice(0, 2) + '/' + value.slice(2);
    } else if (value.length >= 5) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 6);
    }

    e.target.value = value.slice(0, 8); // Limita a DD/MM/AA
});


    async function loadProdutos() {
        try {
            const response = await fetch('produtos.json');
            if (!response.ok) {
                throw new Error('Erro ao carregar o arquivo JSON');
            }
            const jsonData = await response.json();
            produtosJSON = jsonData.map(item => ({
                ...item,
                "Código de Barras": String(item["Código de Barras"]).trim(),
                "CÓDIGO": String(item["CÓDIGO"]).trim()
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
        const validity = document.getElementById('validity').value;

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

    generateFileButton.addEventListener('click', function () {
        try {
            let fileContent = 'Codigo;Descricao;Codigo de Barras;Quantidade;Validade;Marca\n';

            products.forEach(product => {
                const identifier = product.identifier;
                const matchingProduct = produtosJSON.find(item =>
                    item["Código de Barras"] === identifier || item["CÓDIGO"] === identifier
                );

                if (matchingProduct) {
                    fileContent += `${matchingProduct["CÓDIGO"]};${matchingProduct["DESCRIÇÃO"]};${matchingProduct["Código de Barras"]};${product.quantity};${product.validity || '-'};${matchingProduct["MARCA"]}\n`;
                } else {
                    let codigo = '-';
                    let barras = '-';
                    const isCodigoBarras = identifier.length >= 8 && /^\d+$/.test(identifier);
                    if (isCodigoBarras) {
                        barras = identifier;
                    } else {
                        codigo = identifier;
                    }
                    fileContent += `${codigo};-;${barras};${product.quantity};${product.validity || '-'};-\n`;
                }
            });

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

    tableBody.addEventListener('click', function (event) {
        const row = event.target.closest('tr');
        if (row) {
            const index = row.dataset.index;
            const product = products[index];

            document.getElementById('identifier').value = product.identifier;
            document.getElementById('quantity').value = product.quantity;
            document.getElementById('validity').value = product.validity || '';

            products.splice(index, 1);
            localStorage.setItem('products', JSON.stringify(products));
            updateTable();
        }
    });
});
