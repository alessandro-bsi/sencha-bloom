import React from 'react';
import GraphComponent from '../simple/Charts'; // Import your graph component
import 'reactjs-popup/dist/index.css';
import ActorTabs from "./Tab";

const Nodes = ({ addActorHandler, editActorHandler, currentAccount, providers, suppliers, manufacturers, distributors, retailers }) => {
    return (
        <div className="container">
            <GraphComponent
                providers={providers}
                suppliers={suppliers}
                retailers={retailers}
                manufacturers={manufacturers}
                distributors={distributors}
            />

            <ActorTabs
                addActorHandler={addActorHandler}
                editActorHandler={editActorHandler}
                currentAccount={currentAccount}
                providers={providers}
                suppliers={suppliers}
                retailers={retailers}
                manufacturers={manufacturers}
                distributors={distributors}
            />

        </div>
    );
};

export default Nodes;
