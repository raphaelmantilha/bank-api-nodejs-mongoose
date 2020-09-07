import express from 'express';

import {accountModel} from '../models/account.js';

const app = express();

app.get('/account',async(req,res)=>{
    try{
        const accounts= await accountModel.find({});
        res.send(accounts);
    }catch(error){
        res.status(500).send(error);
    }
});

app.get('/account/:agencia/:conta',async(req,res)=>{
    try{
        const account = await accountModel.findOne({agencia:req.params.agencia,conta:req.params.conta});
        if(!account){
            res.status(404).send("Conta não existe.");
        }
        res.status(200).send(account);
    }catch(error){
        res.status(500).send(error);
    }
});

app.get('/account/:agencia',async(req,res)=>{
    try{
        const accounts = await accountModel.find({agencia:req.params.agencia});
        if(accounts.length==0){
            res.status(200).send("Não há contas cadastradas para esta agência.");
        }
        res.status(200).send(`Há ${accounts.length} contas cadastradas para a agência ${req.params.agencia}`);
    }catch(error){
        res.status(500).send(error);
    }
});

app.get('/average/:agencia',async(req,res)=>{
    try{
        const accounts = await accountModel.find({agencia:req.params.agencia});
        
        const sumBalances = accounts.reduce((accumulator,currentAccount)=>{
            return accumulator+currentAccount.balance;
        },0);

        res.status(200).send(`Média das contas da agência ${req.params.agencia} é ${sumBalances/accounts.length}`);

    }catch(error){
        res.status(500).send(error);     
    }
});

app.get('/menoressaldos/:quantidade',async(req,res)=>{
    const menoressaldos=[];
    try{
        const accounts = await accountModel.find({});
        accounts.sort((a,b)=>{
            return a.balance - b.balance;
        });
        
        for(let i=0;i<req.params.quantidade;i++){
            const contasPoucoSaldo={
                agencia: accounts[i].agencia,
                conta:accounts[i].conta,
                saldo:accounts[i].balance
            };
            menoressaldos.push(contasPoucoSaldo);

        }

        res.status(200).send(menoressaldos);
    }catch(error){
        res.status(500).send(error);
    }
})

app.get('/maioressaldos/:quantidade',async(req,res)=>{
    const maioressaldos=[];
    try{
        const accounts = await accountModel.find({});
        accounts.sort((a,b)=>{
            return b.balance - a.balance;
        });
        
        for(let i=0;i<req.params.quantidade;i++){
            const contasMaioresSaldos={
                agencia: accounts[i].agencia,
                conta:accounts[i].conta,
                saldo:accounts[i].balance
            };
            maioressaldos.push(contasMaioresSaldos);

        }

        res.status(200).send(maioressaldos);
    }catch(error){
        res.status(500).send(error);
    }
});

app.get('/maioressaldosporagencia',async(req,res)=>{
    try{
        const accounts = await accountModel.find({});
        const agencias = [...new Set(accounts.map(account=>account.agencia))];
        agencias.forEach(async function(agencia){
            const contasDaAgencia = accounts.filter(account=>account.agencia===agencia);
            const contasOrdenadas = contasDaAgencia.sort((a,b)=>{
                return b.balance - a.balance;
            });
            const clienteRico=await accountModel.findOneAndUpdate(
                {agencia:contasOrdenadas[0].agencia,conta:contasOrdenadas[0].conta},
                {agencia:99},
                {new:true}
            );
        })

        const clientesRicos = await accountModel.find({agencia:99});
        res.send(clientesRicos);
    }catch(error){
        res.status(500).send(error);
    }
});

app.put('/account/deposito',async(req,res)=>{
    try{
        const account = await accountModel.findOneAndUpdate(
                        {agencia:req.body.agencia,conta:req.body.conta},
                        {$inc:{balance:req.body.deposito}},
                        {new:true}
                        );
        if(!account){
            res.status(404).send("Conta não existe.");
        }
        res.status(200).send(account);
    }catch(error){
        res.status(500).send(error);
    }
});

app.put('/account/saque',async(req,res)=>{
    const tarifaSaque=1;
    let updatedAccount;
    try{
        const account = await accountModel.findOne(
            {agencia:req.body.agencia,conta:req.body.conta},
            function(err,accountToChange){
              if(err){
                  throw new Error("Não foi possível consultar a conta.")
              }
            
              if(accountToChange){
                    if(accountToChange.balance-req.body.saque-tarifaSaque>0){
                    accountToChange.balance=accountToChange.balance-req.body.saque-tarifaSaque;
                    accountToChange.save();
                    updatedAccount=accountToChange;
                    }
                    else{
                    res.status(404).send("Saldo insuficiente para realizar o saque.")
                    }
                }else{
                res.status(404).send("Conta não existe.");
                }        
            }
        );
        res.status(200).send(updatedAccount);
    }catch(error){
        res.status(500).send(error);
    }
});

app.put('/account/transferencia',async(req,res)=>{
    let mesmaAgencia=false;
    let tarifaTransferencia=0;
    let contaOrigemAposTransferencia;
    let contaDestinoAposTransferencia;
    
    if(req.body.agenciaOrigem===req.body.agenciaDestino) mesmaAgencia=true;

    const contaOrigem = await accountModel.findOne(
        {agencia:req.body.agenciaOrigem,conta:req.body.contaOrigem}, 
        function(err,contaOrigemEncontrada){
            if(err){
                throw new Error("Não foi possível localizar a conta de origem.")
            }
            if(contaOrigemEncontrada){
               if(!mesmaAgencia) tarifaTransferencia=8;
              
               if(contaOrigemEncontrada.balance-req.body.valorTransferencia-tarifaTransferencia>=0){
                    contaOrigemEncontrada.balance=contaOrigemEncontrada.balance-req.body.valorTransferencia-tarifaTransferencia;
                    contaOrigemEncontrada.save();
                    contaOrigemAposTransferencia=contaOrigemEncontrada;
                }else{
                    res.status(404).send("Saldo insuficiente para realizar a transferência.")
                }
            }
            else{
                res.status(404).send("Conta não existe.");
            }  
        }
        );
    
    const contaDestino = await accountModel.findOne(
        {agencia:req.body.agenciaDestino,conta:req.body.contaDestino}, 
        function(err,contaDestinoEncontrada){
            if(err){
                throw new Error("Não foi possível localizar a conta de destino.")
            }
        
            if(contaDestinoEncontrada){   
                contaDestinoEncontrada.balance=contaDestinoEncontrada.balance+req.body.valorTransferencia;
                contaDestinoEncontrada.save();
                contaDestinoAposTransferencia=contaDestinoEncontrada;
            }
            else{
                res.status(404).send("Conta não existe.");
            }  
        }
        );
        console.log(contaDestinoAposTransferencia);

        const resposta = {
            agenciaOrigem:req.body.agenciaOrigem,
            contaOrigem:req.body.contaOrigem,
            saldoContaOrigem:contaOrigemAposTransferencia.balance,
            agenciaDestino:req.body.agenciaDestino,
            contaDestino:req.body.contaDestino,
            saldoContaDestino:contaDestinoAposTransferencia.balance
        }

        res.status(200).send(resposta);
});

app.delete('/account/:agencia/:conta',async(req,res)=>{
    try{
        const account = await accountModel.findOneAndDelete({agencia:req.params.agencia,conta:req.params.conta});
        if(!account){
            res.status(404).send("Conta não existe");
        }
        res.status(200).send();
    }catch(error){
        res.status(500).send(error);
    }
});

export {app as accountRouter};