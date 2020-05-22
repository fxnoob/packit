import React from 'react';
import 'tui-image-editor/dist/tui-image-editor.css'
import axios from 'axios';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import ImageEditor from '../../containers/ImageEditor';
import Db from '../../services/dbService';
const queryString = require("query-string");
const parsed = queryString.parse(location.search);
const db = new Db();
export default class Card extends React.Component {
  editorRef = React.createRef();
  constructor() {
    super();
    this.urlString = decodeURIComponent(parsed.url ? parsed.url : "");
    this.state = {
      imageUrl: this.urlString,
      title: '',
      description: this.urlString,
      tags: "",
      favorite: '',
      type: 'sketch',
      isSaving: false,
      openImageEditor: false,
      imageInstance: null,
    };
  }
  componentDidMount() {
    db.get('data').then(Data => {
      const {data} = Data;
      this.setState({
        title: data.cardTitle == '' ? this.state.type : data.cardTitle,
        description:`${data.cardDescription} - ${this.state.imageUrl}`,
        type: data.cardType == '' ? this.state.type : data.cardType,
        tags: data.cardTags || '',
      });
    })
  }
  getUserCookie = () => {
    return new Promise((resolve, reject) => {
      const cookieDetails = {
        url: 'https://angora.techpacker.com',
        name: 'user',
      };
      chrome.cookies.get(cookieDetails, (cookie) => {
        // chrome.cookies.get takes callback as 2nd parameter
        // when callback returns we resolve
        resolve(cookie);
      });
    });
  };

  getUserInfo = async () => {
    let userInfo;
    // getUserCookie returns a Promise
    // so using await to wait for it to return
    const userCookie = await this.getUserCookie();
    if (userCookie) {
      // decode cookie value using decodeURIComponent
      userInfo = decodeURIComponent(userCookie.value);
      // user info returns string, need to parse into json
      userInfo = JSON.parse(userInfo);
    } else {
      console.log('Check if you are logged in');
    }
    return userInfo;
  };
  handleChange = (evt) => {
    this.setState({
      [evt.target.name]: evt.target.value,
    });
  };
  async getImageAsBlob(imgUrl) {
    let response = await fetch(imgUrl);
    let blob = await response.blob(); // download as Blob object
    console.log(blob);
    return blob;
  }
  uploadImageAndTagsViaUrlToCard = async (imgUrl, cardData) => {
    const blob = await this.getImageAsBlob(imgUrl);
    const saveCardUrl = 'https://angora.techpacker.com/api/favorite/save/card';
    // create formdata as favorite/save/card need form data
    // we generally use form data when image upload is involved
    let fd = new FormData();
    fd.append('card', JSON.stringify(cardData));
    fd.append('timestamp', JSON.stringify(Date.now()));
    fd.append('upload', blob);
    const response = await fetch(saveCardUrl, {
      method: 'POST',
      body: fd,
    });
    if (response.ok) {
      // if HTTP-status is 200-299
      // get the response body (the method explained below)
      alert('Yay! card saved! image uploaded!');
    } else {
      alert('Nay! card saved failed!');
    }
    this.setState({isSaving: false});
  }
  handleSubmit = async evt => {
    this.setState({isSaving: true});
    evt.preventDefault();
    const userInfo = await this.getUserInfo();
    let payloadData = this.state;
    let tags = payloadData.tags.split(',');
    payloadData.tags = tags;
    payloadData.title = payloadData.title == '' ? payloadData.type: payloadData.title;
    let payload = {
      pack: { ...payloadData, favorite: `${userInfo.id}` },
      timeStamp: Date.now(),
    };
    try {
      let data = await axios.post(
        'https://angora.techpacker.com/api/favorite/createCard ',
        payload
      );
      if (this.state.imageUrl && data.data) {
        // data.data is creaded card data returned from server
        this.uploadImageAndTagsViaUrlToCard(this.state.imageUrl, data.data);
      }
    } catch (error) {
      this.setState({isSaving: false});
      alert("error");
    }
  }
  imageEditorOpener = () => {
    console.log({ref: this.editorRef.current});
    this.setState({openImageEditor: true});
  }
  imageEditorClose = () => {
    const dataUrl = this.state.imageInstance.toDataURL();
    console.log({dataUrl})
    this.setState({imageUrl: dataUrl, openImageEditor: false});
  }
  getInstance = imageInstance => {
    this.setState({imageInstance: imageInstance});
  }
  render() {
    return (
      <React.Fragment>
        <Dialog
          fullScreen
          open={this.state.openImageEditor}
          onClose={this.imageEditorClose}
          aria-labelledby="simple-modal-title"
          aria-describedby="simple-modal-description"
        >
          <DialogContent>
            <ImageEditor
              getInstance={this.getInstance}
              ref={this.editorRef}
              includeUI={{
                loadImage: {
                  path: this.state.imageUrl,
                  name: 'SampleImage'
                },
                menuBarPosition: 'top'
              }}
              cssMaxHeight={400}
              cssMaxWidth={700}
              selectionStyle={{
                cornerSize: 20,
                rotatingPointOffset: 70
              }}
              usageStatistics={true}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.imageEditorClose} color="primary">
              Close
            </Button>
            <Button onClick={this.imageEditorClose} color="primary" autoFocus>
              Done
            </Button>
          </DialogActions>
        </Dialog>
        <form
          onSubmit={(evt) => {
            this.handleSubmit(evt);
          }}
        >
          <img onClick={this.imageEditorOpener} src={this.state.imageUrl} style={{width: '300px', height: '300px'}}/>
          <br/>
          <input
            name="imageUrl"
            type="hidden"
            placeholder="Image Url"
            value={this.urlString}
          />

          <input
            name="title"
            type="text"
            placeholder={`Card Title default name is ${this.state.type}`}
            value={this.state.title}
            onChange={this.handleChange}
          />

          <textarea
            name="description"
            type="text"
            placeholder="Description"
            value={this.state.description}
            onChange={this.handleChange}
          />

          <input
            name="tags"
            type="text"
            placeholder={`tags (separated by ,)`}
            value={this.state.tags}
            onChange={this.handleChange}
          />
          <select
            id="type"
            name="type"
            value={this.state.type}
            onChange={this.handleChange}
          >
            <option value="sketch">Sketch </option>
            <option value="size">Size</option>
            <option value="material">Material</option>
            <option value="table">table</option>
          </select>

          <button className="button" type="submit" disabled={this.state.isSaving}>
            {this.state.isSaving==true? 'Saving...': 'Save'}
          </button>
        </form>
      </React.Fragment>
    );
  }
}
