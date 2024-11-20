import React, { useState } from 'react';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Table, {ActorTable, ProductTable} from "./Table";
import NewActorForm from "../simple/ActorForm";

function ActorTabs({ addActorHandler, editActorHandler, currentAccount, providers, suppliers, manufacturers, distributors, retailers }) {
    const [key, setKey] = useState('providers');

    return (
        <Tabs
            id="controlled-tab-example"
            activeKey={key}
            onSelect={(k) => setKey(k)}
            className="mb-3"
            fill
        >
            <Tab eventKey="providers" title="Providers">
                <ActorTable data={providers} tableName={""} currentAccount={currentAccount}/>
            </Tab>
            <Tab eventKey="suppliers" title="Suppliers">
                <ActorTable data={suppliers} tableName={""} currentAccount={currentAccount}/>
            </Tab>
            <Tab eventKey="manufacturers" title="Manufacturers">
                <ActorTable data={manufacturers} tableName={""} currentAccount={currentAccount}/>
            </Tab>
            <Tab eventKey="distributors" title="Distributors">
                <ActorTable data={distributors} tableName={""} currentAccount={currentAccount}/>
            </Tab>
            <Tab eventKey="retailers" title="Retailers">
                <ActorTable data={retailers} tableName={""} currentAccount={currentAccount}/>
            </Tab>
            <Tab eventKey="addNew" title="Add User">
                <NewActorForm currentAccount={currentAccount} mainHandler={addActorHandler}></NewActorForm>
            </Tab>
        </Tabs>
    );
}

export default ActorTabs;