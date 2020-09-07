import express from 'express';
import mongoose from 'mongoose';

import {accountRouter} from './routes/accountRouter.js';

(async()=>{
    try{
        await mongoose.connect("mongodb://localhost/bank",{
            useNewUrlParser:true,
            useUnifiedTopology:true,
            useFindAndModify:false
        });
    }catch(error){
        console.log("Erro ao conectar no MongoDB");
    }
})();

const app = express();

app.use(express.json());
app.use(accountRouter);

app.listen(3010,()=>console.log("API Iniciada!"));
