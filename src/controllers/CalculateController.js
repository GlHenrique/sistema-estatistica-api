module.exports = {
    async calculate(request, response) {
        let {
            variableName,
            method,
            analyze,
            order,
            values,
            isContinue,
        } = request.body;
        if (analyze === 'discreteQuantitative') {
            values = values.map(item => {
                return Number(item); // Convertendo para Number
            });
            if (values.includes(NaN)) {
                return response.status(400).send(['Valores inválidos']);
            }
            values.sort(
                (comparingA, comparingB) => {
                    return comparingA - comparingB;
                }
            ); // Organizando do menor para o maior
        }
        // if (analyze === 'qualitative' && order === 'false') {
        //     return response.json({
        //         arrayFormatted: values
        //     })
        // }
        if (analyze === 'qualitative' && order === 'true') {
            values.sort();
        }
        return response.json({
            arrayFormatted: values
        });
    }
};
