import React from 'react';
import { Ixo } from 'ixo-module';
import Launchbutton from './launch-button';
import Web3 from 'web3';
import swal from 'sweetalert';
import utf8 from 'utf8';
import base64 from 'base-64'
import { ENGINE_METHOD_DIGESTS } from 'constants';


export default class Dashboard extends React.Component {

  constructor(props) {
    super(props);

    this.state = { messageBody: '', ixo: null, messageBody2: '', messageBody3: '', stateHash: null, globProjJSON: '' }

    this.blockchainProviders = {
      metamask: { id: 0, doShow: false, windowKey: "web3", extension: "Metamask", provider: null },
      ixo_keysafe: { id: 1, doShow: true, windowKey: "ixoKs", extension: "IXO Keysafe", provider: null }
    };

    // This binding is necessary to make `this` work in the callback
    this.handleExtensionLaunch = this.handleExtensionLaunch.bind(this);
    this.handleMessageBodyChanged = this.handleMessageBodyChanged.bind(this);
    this.handleMessageBodyChanged2 = this.handleMessageBodyChanged2.bind(this);
    this.handleMessageBodyChanged3 = this.handleMessageBodyChanged3.bind(this);
    this.getEthereumAddressAsync = this.getEthereumAddressAsync.bind(this);
    this.handleRequestInfoButtonClicked = this.handleRequestInfoButtonClicked.bind(this)
    this.handleFormButtonClicked = this.handleFormButtonClicked.bind(this);
    this.handleSchemaButtonClicked = this.handleSchemaButtonClicked.bind(this);
    this.encodeJSON = this.encodeJSON.bind(this);
    this.uploadAndInsert = this.uploadAndInsert.bind(this);

    if (this.blockchainProviders.metamask.doShow) {
      this.initProvider(this.blockchainProviders.metamask);
    }
    if (this.blockchainProviders.ixo_keysafe.doShow) {
      this.initProvider(this.blockchainProviders.ixo_keysafe);
    }

    this.signMessageWithProvider = this.signMessageWithProvider.bind(this);
    this.signData = this.signData.bind(this);

  }

  componentDidMount() {
    this.setState({ ixo: new Ixo() });
  }

  handleRequestInfoButtonClicked(e) {
    this.blockchainProviders.ixo_keysafe.provider.getInfo((error, response) => {
      alert(`Dashboard handling received response for INFO response: ${JSON.stringify(response)}, error: ${JSON.stringify(error)}`)
    })
  }

  handleSimulateDidDocLedgeringButtonClicked = (e) => {
    this.blockchainProviders.ixo_keysafe.provider.getDidDoc((error, didDocResponse) => {
      if (error) {
        alert(`Simulate DID Doc retrieval error: ${JSON.stringify(error)}`)
      } else {
        console.log(`Simulate signing DID Doc retrieval response: \n${JSON.stringify(didDocResponse)}\n`)
        this.blockchainProviders.ixo_keysafe.provider.requestSigning(JSON.stringify(didDocResponse), (error, signatureResponse) => {
          if (error) {
            alert(`Simulate DID Doc signing error: ${JSON.stringify(error)}`)
          } else {
            console.log(`Simulate signing DID Doc  SIGN response: \n${JSON.stringify(signatureResponse)}\n, error: ${JSON.stringify(error)}`)

            const { signatureValue, created } = signatureResponse
            const ledgerObjectJson = this.generateLedgerObjectJson(didDocResponse, signatureValue, created)
            const ledgerObjectUppercaseHex = new Buffer(ledgerObjectJson).toString("hex").toUpperCase()
            const ledgeringEndpoint = `http://35.192.187.110:46657/broadcast_tx_sync?tx=0x${ledgerObjectUppercaseHex}`

            this.performLedgeringHttpRequest(ledgeringEndpoint, (response) => {
              console.log(`success callback from perform ledgering HTTP call response: \n${response}`)
              alert(`success callback from perform ledgering HTTP call response: ${response}`)
            }, (status, text) => {
              console.log(`failure callback from perform ledgering HTTP call status: \n${status}\ntext: \n${text}`)
              alert(`failure callback from perform ledgering HTTP call status: \n${status}, text: \n${text}`)
            })
          }
        })
      }
    })
  }


  performLedgeringHttpRequest = (url, success, failure) => {
    var request = new XMLHttpRequest()
    request.open("GET", url, true);
    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        if (request.status === 200)
          success(request.responseText);
        else if (failure)
          failure(request.status, request.statusText);
      }
    };
    request.send(null);
  }

  generateLedgerObjectJson = (didDoc, signature, created) => {
    const signatureValue = [1, signature]
    return JSON.stringify({ payload: [10, didDoc], signature: { signatureValue, created } })
  }

  initProvider(blockchainProvider) {
    if (!window[blockchainProvider.windowKey]) {
      blockchainProvider.doShow = false;
      window.alert(`Please install ${blockchainProvider.extension} first.`);
    } else {
      if (!blockchainProvider.provider) {
        if (blockchainProvider.id === this.blockchainProviders.metamask.id) {
          blockchainProvider.provider = new Web3(window[blockchainProvider.windowKey].currentProvider);
        } else if (blockchainProvider.id === this.blockchainProviders.ixo_keysafe.id) {
          // blockchainProvider.provider = window[blockchainProvider.windowKey].currentProvider;
          const IxoKeysafeInpageProvider = window[blockchainProvider.windowKey]
          blockchainProvider.provider = new IxoKeysafeInpageProvider();
        }
      }
    }
  }

  handleMessageBodyChanged(e) {
    this.setState({ messageBody: e.target.value });
  }
  handleMessageBodyChanged2(e) {
    this.setState({ messageBody2: e.target.value });
  }

  handleMessageBodyChanged3(e) {
    this.setState({ messageBody3: e.target.value });
  }

  handleExtensionLaunch(providerId) {
    // console.log(`***** target: ${target}`);

    if (this.state.messageBody.length === 0) {
      return;
    }
    const blockchainProvider = (providerId === this.blockchainProviders.metamask.id) ? this.blockchainProviders.metamask : this.blockchainProviders.ixo_keysafe;
    this.signMessageWithProvider(this.state.messageBody, blockchainProvider, "http://localhost:5000/");
  }
  handleSchemaButtonClicked(providerId) {
    if (this.state.messageBody2.length === 0) {
      return;
    }
    const blockchainProvider = (providerId === this.blockchainProviders.metamask.id) ? this.blockchainProviders.metamask : this.blockchainProviders.ixo_keysafe;
    this.signData(this.state.messageBody2, blockchainProvider);
  }


  handleFormButtonClicked(providerId) {
    if (this.state.messageBody3.length === 0) {
      return;
    }
    const blockchainProvider = (providerId === this.blockchainProviders.metamask.id) ? this.blockchainProviders.metamask : this.blockchainProviders.ixo_keysafe;
    this.signData(this.state.messageBody3, blockchainProvider);
  }

  signData(message, blockchainProvider) {
    if (blockchainProvider.id === this.blockchainProviders.ixo_keysafe.id) {
      this.blockchainProviders.ixo_keysafe.provider.requestSigning(message, (error, response) => {
        console.log(`Dashboard handling received response for SIGN response: \n${JSON.stringify(response)}\n, error: \n${JSON.stringify(error)}\n`)
      })
      return
    } else {
      this.getEthereumAddressAsync().then(address => {
        console.log(`${blockchainProvider.extension} -> Address: ${address}`);

        // actual signing ->>
        var dataInHex = '0x' + new Buffer(message).toString('hex');

        blockchainProvider.provider.eth.personal.sign(dataInHex, address, "test password!")
          .then(console.log);
      });
    }
  }

  // bit64 encoding function; "text" parameter is a json string
  encodeJSON(text) {
    // var utf8 = require('utf8');
    // var binaryToBase64 = require('binaryToBase64');
    var bytes = utf8.encode(text);
    var encoded = base64.encode(bytes);
    return encoded;
  }

  // upload documents to pds
  // text: encoded json for claim or schema
  // message: project json string
  // type: string that reads either "form" or "schema"
  // 
  // uploadAndInsert(text, PDSURL, message, type) {
  //   let dataUrl = 'data:application/json;base64, ' + text;
  //   var hash = this.state.ixo.project.createPublic(dataUrl, PDSURL).then((result) => {
  //     // check output, it should now output the hash   
  //     console.log("Result: " + JSON.stringify(result));

  //     // display the "templates" property of project json
  //     var projectJSON = JSON.parse(message);
  //     console.log("Project JSON templates section" + JSON.stringify(projectJSON['templates']));

  //     // if the type is schema, insert hash into "schema" section of project json 
  //     if (type == "schema") {
  //       console.log("schema hash: " + JSON.stringify(result.result));
  //       projectJSON['templates']['schema'] = JSON.stringify(result.result);
  //       this.state.messageBody = projectJSON; 
        
  //     }
  //     if (type == "form") {
  //       console.log("form hash: " + JSON.stringify(result.result));
  //       projectJSON['templates']['form'] = JSON.stringify(result.result);
  //       // update the state of messageBody to reflect new addition
  //       this.state.messageBody = projectJSON;

  //     }
  //     // check to see if templates were inserted into project json 
  //     console.log("Project JSON templates section after additions: " + JSON.stringify(projectJSON['templates']));

  //   }).catch((error) => {
  //     console.log("Error, unable to return hash");
  //     console.log(error);
  //   });
  // }

  uploadAndInsert(schemaText, formText, PDSURL, message, type) {
    let dataUrl1 = 'data:application/json;base64, ' + schemaText;
    var hash = this.state.ixo.project.createPublic(dataUrl1, PDSURL).then((result) => {
      // check output, it should now output the hash   
      console.log("Result: " + JSON.stringify(result));

      // display the "templates" property of project json
      var projectJSON = JSON.parse(message);
      console.log("Project JSON templates section" + JSON.stringify(projectJSON['templates']));

      // insert schema hash into project json 
      console.log("schema hash: " + JSON.stringify(result.result));
      projectJSON['templates']['schema'] = JSON.stringify(result.result);


      let dataUrl2 = 'data:application/json;base64, ' + formText;
      var hash2 = this.state.ixo.project.createPublic(dataUrl1, PDSURL).then((result) => {
        // check output, it should now output the hash   
        console.log("Result: " + JSON.stringify(result));

        // insert form hash into project json 
        projectJSON['templates']['form'] = JSON.stringify(result.result);

        // check to see if templates were inserted into project json
        console.log("Project JSON templates section after additions: " + JSON.stringify(projectJSON['templates']));
        
        // update the state of globProjJSON to match 
        this.state.globProjJSON = projectJSON;
        console.log("global projectJSON: " + JSON.stringifythis.state.globProjJSON['templates']['form']);

      }).catch((error) => {
        console.log("Error, unable to return form");
        console.log(error);
      });

    }).catch((error) => {
      console.log("Error, unable to return schema hash");
      console.log(error);
    });
  }

  // have user sign and upload their project
  signMessageWithProvider(message, blockchainProvider, PDSURL) {
    // encode the claim schema and claim form json strings and upload them to pds
    var encodedClaimSchema = this.encodeJSON(this.state.messageBody2);
    console.log("Encoded schema json: " + encodedClaimSchema);
    var encodedClaimForm = this.encodeJSON(this.state.messageBody3);
    console.log("Encoded form json: " + encodedClaimForm);
    var hashes = this.uploadAndInsert(encodedClaimSchema, encodedClaimForm, PDSURL, this.state.messageBody, "schema");


    if (blockchainProvider.id === this.blockchainProviders.ixo_keysafe.id) {
      this.blockchainProviders.ixo_keysafe.provider.requestSigning(message, (error, response) => {
        //alert(`Dashboard handling received response for SIGN response: ${JSON.stringify(response)}, error: ${JSON.stringify(error)}`)
        console.log(`Dashboard handling received response for SIGN response: \n${JSON.stringify(response)}\n, error: \n${JSON.stringify(error)}\n`)
        try {
          this.state.ixo.project.createProject(JSON.parse(message), response, PDSURL).then((result) => {
            console.log(`Project Details:   \n${JSON.stringify(result)}`)
            swal({
              title: 'Your project has been created!',
              text: 'You can find your new project on the ixo website with other current projects. \n \n Click OK to be redirected to the ixo website',
              type: "success"
            })
              .then(redirect => {
                if (redirect) {
                  window.location.href = 'https://ixo.foundation/';
                }
              });
          })
        } catch (error) {
          console.log("Incorrect PDS URL format")
          swal("ERROR", "Incorrect PDS URL format", "error")
        }

      })
      return
    } else {
      this.getEthereumAddressAsync().then(address => {
        console.log(`${blockchainProvider.extension} -> Address: ${address}`);

        // actual signing ->>
        var dataInHex = '0x' + new Buffer(message).toString('hex');

        blockchainProvider.provider.eth.personal.sign(dataInHex, address, "test password!")
          .then(console.log);
      });
    }
  }

  getEthereumAddressAsync() {
    const eth = this.blockchainProviders.metamask.provider.eth;
    return new Promise((resolve, reject) => {
      // resolve(provider.debug());
      eth.getAccounts(function (error, accounts) {
        if (error || 0 === accounts.length) {
          reject(error);
        }
        resolve(accounts[0]);
      });
    });
  }


  render() {
    return (
      <div>
        {/* {this.blockchainProviders.ixo_keysafe.doShow && 
          <button onClick={this.handleSimulateDidDocLedgeringButtonClicked}>Ledger DID Manually</button>
        }
        {this.blockchainProviders.ixo_keysafe.doShow && 
          <button onClick={this.handleRequestInfoButtonClicked}>ixo INFO</button>
        } */}
        {/* <div></div>
        <br></br>
        <br></br>
        <br></br> */}

      <br></br>
      <b>1. Paste the Schema text here:</b>
      <br></br>
      <textarea style={{ height: 100, width: 400 }}
        value={this.state.messageBody2} 
        onChange={this.handleMessageBodyChanged2} />
      <br></br>
      <br></br>
      <br></br>
      <b>2. Paste the Form text here:</b>
      <br></br>
      <textarea style={{ height: 100, width: 400 }}
        value={this.state.messageBody3} 
        onChange={this.handleMessageBodyChanged3}/>
      <br></br>
      <br></br>
      <br></br>
      <b>3. Paste the Project Details here</b><br></br><b>to sign and create your project:</b>
      <br></br>
      <textarea style={{ height: 100, width: 400 }}
        value={this.state.messageBody} 
        onChange={this.handleMessageBodyChanged} /> 
      <br></br>
      <br></br>
        <Launchbutton
          provider={this.blockchainProviders.ixo_keysafe.id}
          title="Sign and Create Project"
          handleLaunchEvent={this.handleExtensionLaunch} />
        
        {this.blockchainProviders.ixo_keysafe.doShow}

      </div>
    )
  }
}
