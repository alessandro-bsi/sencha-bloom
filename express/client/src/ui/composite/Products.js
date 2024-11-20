import NewOrder from "../simple/NewOrder";
import {ProductTable} from "./Table";

function Products({currentAccount, products, newProductHandler, editProductHandler}) {
    return (
        <div className="container">
            <h5>Order a product:</h5>
            <NewOrder
                submitHandler={(event, productName, productDescription) => newProductHandler(event, productName, productDescription)}
            />
            <ProductTable
                data={products}
                tableName=""
                currentAccount={currentAccount}
            />

        </div>
    )
}

export default Products
