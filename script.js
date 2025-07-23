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

    validityInput.addEventListener('input', function (e) {
        let digits = e.target.value.replace(/\D/g, '');

        let formatted = '';
        if (digits.length <= 4) {
            if (digits.length >= 3) {
                formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4);
            } else {
                formatted = digits;
            }
        } else {
            if (digits.length >= 5) {
                formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 6);
            } else {
                formatted = digits;
            }
        }

        e.target.value = formatted;
    });

    function updateTable() {
        tableBody.innerHTML = '';
        products.forEach((product, productIndex) => {
            product.validities.forEach((validity, validityIndex) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${product.identifier}</td><td>${validity.quantity}</td><td>${validity.date}</td>`;
                row.dataset.productIndex = productIndex;
                row.dataset.validityIndex = validityIndex;
                tableBody.appendChild(row);
            });
        });
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const identifier = String(document.getElementById('identifier').value).trim();
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        const validity = document.getElementById('validity').value.trim();

        if (!identifier || isNaN(quantity) || !validity) {
            alert("Preencha todos os campos corretamente.");
            return;
        }

        let existingProduct = products.find(p => p.identifier === identifier);

        if (!existingProduct) {
            existingProduct = { identifier, validities: [] };
            products.push(existingProduct);
        }

        let existingValidity = existingProduct.validities.find(v => v.date === validity);

        if (existingValidity) {
            existingValidity.quantity += quantity;
        } else {
            existingProduct.validities.push({ date: validity, quantity });
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
                product.validities.forEach(validity => {
                    const identifier = product.identifier;
                    const match = produtosJSON.find(item =>
                        item["Código de Barras"] === identifier || item["CÓDIGO"] === identifier
                    );

                    if (match) {
                        fileContent += `${match["CÓDIGO"]};${match["DESCRIÇÃO"]};${match["Código de Barras"]};${validity.quantity};${validity.date};${match["MARCA"]}\n`;
                    } else {
                        let codigo = '-';
                        let barras = '-';
                        if (identifier.length >= 8 && /^\d+$/.test(identifier)) barras = identifier;
                        else codigo = identifier;
                        fileContent += `${codigo};-;${barras};${validity.quantity};${validity.date};-\n`;
                    }
                });
            });

            const blob = new Blob([fileContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'produtos.csv';
            link.click();
        } catch (error) {
            console.error('Erro ao gerar CSV:', error);
            alert('Erro ao gerar CSV. Veja o console para detalhes.');
        }
    });

    clearTableButton.addEventListener('click', () => {
        confirmationModal.style.display = 'block';
    });

    cancelClearButton.addEventListener('click', () => {
        confirmationModal.style.display = 'none';
    });

    confirmClearButton.addEventListener('click', () => {
        products = [];
        localStorage.removeItem('products');
        updateTable();
        confirmationModal.style.display = 'none';
    });

    removeLastButton.addEventListener('click', () => {
        if (products.length > 0) {
            const lastProduct = products[products.length - 1];
            if (lastProduct.validities.length > 1) {
                lastProduct.validities.pop();
            } else {
                products.pop();
            }
            localStorage.setItem('products', JSON.stringify(products));
            updateTable();
        }
    });

    tableBody.addEventListener('click', function (event) {
        const row = event.target.closest('tr');
        if (row) {
            const productIndex = row.dataset.productIndex;
            const validityIndex = row.dataset.validityIndex;
            const product = products[productIndex];
            const validity = product.validities[validityIndex];

            document.getElementById('identifier').value = product.identifier;
            document.getElementById('quantity').value = validity.quantity;
            document.getElementById('validity').value = validity.date;

            product.validities.splice(validityIndex, 1);
            if (product.validities.length === 0) {
                products.splice(productIndex, 1);
            }
            localStorage.setItem('products', JSON.stringify(products));
            updateTable();
        }
    });

    async function loadProdutos() {
        try {
            const response = await fetch('produtos.json');
            if (!response.ok) throw new Error('Erro ao carregar JSON');
            const jsonData = await response.json();
            produtosJSON = jsonData.map(item => ({
                ...item,
                "Código de Barras": String(item["Código de Barras"]).trim(),
                "CÓDIGO": String(item["CÓDIGO"]).trim()
            }));
        } catch (error) {
            console.error('Erro ao carregar JSON:', error);
        }
    }

    loadProdutos();
});
