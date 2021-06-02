const express = require('express')
const { v4: uuidv4 } = require('uuid')

const app = express()

app.use(express.json())

const customers = []; 

/* cpf - string 
   name - string
   id - uuid
   statement - []  
*/

// Middleware - para verificar se o usuário existe: 
function verifyIfExistsAccountCPF(request, response, next){
    const {cpf} = request.headers

    const customer = customers.find((customer) => customer.cpf === cpf)

    if (!customer) {
        return response.status(400).json({error: "Customer not found!"})
    }

    request.customer =  customer
    return next(); 
}

function GetBalance(statement){
    const balance = statement.reduce((acc, operation) => {
        if (operation.type === "credit"){
            return acc + operation.amount
        } else {
            return acc - operation.amount; 
        }
    }, 0)
    return balance 
}

// Para criar uma conta: 
app.post("/account", (request, response) =>{
    const {cpf, name} = request.body
    
    const customerAlreadyExists = customers.some((customer) => customer.cpf===cpf)
// Validando se o cliente já existe: 
    if(customerAlreadyExists){
        return response.status(400).json({error: "Customer already Exists!"})
    }

    customers.push({
        cpf, 
        name, 
        id: uuidv4(), 
        statement: []
    })

    return response.status(201).send()
}); 
// Para puxar o extrato: 

// Para verificar se o cpf existe em TODAS as rotas: 
// app.use(verifyIfExistsAccountCPF)
app.get("/statement", verifyIfExistsAccountCPF, (request, response)=>{

    const {customer} = request; 
    
    return response.json(customer.statement)
})
// Para puxar o extrato por data: 
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response)=>{
    const {customer} = request; 
    const {date} = request.query
    const dateFormat = new Date (date + " 00:00")

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString())
    
    return response.json(customer.statement)
})
// Para fazer um depósito: 
app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
    const {description, amount} = request.body; 
    const {customer} = request; 
    const statementOperation = {
        description, 
        amount, 
        created_at : new Date(), 
        type: "credit" 
    }

    customer.statement.push(statementOperation)

    return response.status(201).send(); 



})

// Para fazer um saque: 
app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) =>{
    const {amount} = request.body; 
    const {customer} = request; 

    const balance = GetBalance(customer.statement); 

    if(balance < amount){
        return response.status(400).json({error: "Insufficient funds!"})
    }

    const statementOperation = {
            amount, 
            created_at : new Date(), 
            type: "debit" 
    }
    customer.statement.push(statementOperation); 

    return response.status(201).send()
})

app.listen(3333)