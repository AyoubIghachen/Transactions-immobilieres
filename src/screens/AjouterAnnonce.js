import { FontAwesome } from '@expo/vector-icons';
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView from "react-native-map-clustering";
import { Marker } from "react-native-maps";
import { Layout } from 'react-native-rapi-ui';
import AuthContext from '../AuthContext';
import { firebase } from '../config';

import { LinearGradient } from 'expo-linear-gradient';

import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';

import { Field, Formik } from 'formik';



export default function ({ navigation }) {
  const { user } = useContext(AuthContext);

  const [markers, setMarkers] = useState([]);
  const [visible, setVisible] = useState(false);
  const [mapKey, setMapKey] = useState("");
  const [region, setRegion] = useState(null);
  const [addMarker, setAddMarker] = useState(false);
  const [id, setId] = useState(null);
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [surface, setSurface] = useState("");
  const [type_bien, setType_bien] = useState("");
  const [prix_bien, setPrix_bien] = useState("");
  const [statut, setStatut] = useState("");
  const [type_operation, setType_operation] = useState("");
  const [description, setDescription] = useState("");
  const [etat, setEtat] = useState("");
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [justificatif_name, setJustificatif_name] = useState("");
  const [imageUris, setImageUris] = useState([]);
  const [documentUri, setDocumentUri] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
    getLocation();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`http://192.168.43.59:3002/annonces/Annonceur/${user.id}`);

      //const response = await fetch("http://192.168.43.59:3002/annonces");
      let data = await response.json();

      // Adjust the structure of the markers
      data = data.map(marker => ({
        id: marker.id,
        coordinate: {
          latitude: marker.latitude ? parseFloat(marker.latitude) : 0,
          longitude: marker.longitude ? parseFloat(marker.longitude) : 0,
        },
        type_bien: marker.type_bien,
        prix_bien: marker.prix_bien,
        date_annonce: marker.date_annonce,
        statut: marker.statut,
        type_operation: marker.type_operation,
        description: marker.description,
        motif_rejet: marker.motif_rejet,
        delai: marker.delai,
        etat: marker.etat,
        photo: marker.photo,
        justificatif: marker.justificatif,
      }));

      setMarkers(data);
    } catch (error) {
      console.error(error);
    }
  };


  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };



  const handleMapPress = (event) => {
    if (!addMarker) {
      return;
    }
    setVisible(true);

    console.log(event.nativeEvent.coordinate); // Add this line
  };





  const handleSubmit = async (values, { resetForm }) => {
    try {
      // Upload the images
      const photoUrls = await Promise.all(imageUris.map(async (uri) => {
        const response = await fetch(uri);
        const blob = await response.blob();

        const ref = firebase.storage().ref().child(new Date().getTime().toString());
        const snapshot = await ref.put(blob);

        return await snapshot.ref.getDownloadURL();
      }));


      // Upload the document
      let url = null;
      if (documentUri) {
        const response = await fetch(documentUri);
        const blob = await response.blob();

        const ref = firebase.storage().ref().child(new Date().getTime().toString());
        const snapshot = await ref.put(blob);

        url = await snapshot.ref.getDownloadURL();
      }

      const response = await fetch(`http://192.168.43.59:3002/annonces/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          photo: photoUrls ? photoUrls.join(';') : null,
          latitude: region.latitude,
          longitude: region.longitude,
          justificatif: url,
          statut: "EN_ATTENTE",
          etat: "NULL",
        }),
      });

      if (response.ok) {
        if (region && typeof region.latitude === 'number' && typeof region.longitude === 'number') {
          // Create a new marker
          const newMarker = {
            id,
            coordinate: {
              latitude: region.latitude,
              longitude: region.longitude,
            },
            date_annonce: new Date().toISOString().slice(0, 10),
            surface: values.surface,
            type_bien: values.type_bien,
            prix_bien: values.prix_bien,
            statut: "EN_ATTENTE",
            type_operation: values.type_operation,
            description: values.description,
            etat: "NULL",
            photo: photoUrls,
            justificatif: url,
          };
          // Add the new marker to the markers
          setMarkers([...markers, newMarker]);
          setMapKey(Math.random().toString());
        } else {
          console.error('Invalid region:', region);
        }
        console.log('Announcement added successfully');
        Alert.alert('Success', 'Announcement added successfully');
        resetForm();

        handleCancel(); // reset the form fields and close the modal
        // Delay the closing of the modal by 2 seconds
        // setTimeout(handleCancel, 5000);
      } else {
        console.error('Error adding announcement:', response.status, response.statusText);
        Alert.alert('Error', 'Error adding announcement');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred');
    }
    setAddMarker(false);
  };

  const handleCancel = () => {
    setId(null);
    setLongitude("");
    setLatitude("");
    setSurface("");
    setType_bien("");
    setPrix_bien("");
    setStatut("");
    setType_operation("");
    setDescription("");
    setEtat("");
    setImageUris([]);
    setDocumentUri(null);
    setVisible(false);
    setAddMarker(false);
    setJustificatif_name("");
  };



  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUris(oldUris => [...oldUris, result.assets[0].uri]); // Store the local URI
    }
  };


  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({});

    if (result.type !== 'cancel') {
      setDocumentUri(result.assets[0].uri); // Store the local URI
      setJustificatif_name(result.assets[0].name);
    }
  };

  //console.log(markers);

  const FormikTextInput = ({ field, form, ...props }) => {
    const { name } = field;
    const { setFieldValue } = form;

    return (
      <TextInput
        value={field.value}
        onChangeText={(value) => setFieldValue(name, value)}
        {...props}
      />
    );
  };

  return (
    <Layout>
      <MapView
        key={mapKey}
        style={styles.map}
        onPress={(e) => {
          setRegion((currentRegion) => ({
            ...currentRegion,
            latitude: e.nativeEvent.coordinate.latitude,
            longitude: e.nativeEvent.coordinate.longitude,
          }));
          handleMapPress(e);
        }}
        region={
          region || {
            latitude: 33.57880468714996,
            longitude: -7.643518187105656,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
      >
        {markers.map((marker, index) => {
          if (marker.coordinate && marker.coordinate.latitude && marker.coordinate.longitude) {
            return (
              <Marker
                key={index}
                coordinate={marker.coordinate}
                pinColor={marker.type_bien === "VILLA" ? "red" : "blue"}
                onPress={() => setSelectedMarker(marker)}
              >
                <Image
                  source={require("./../../assets/real-estate.png")}
                  style={{
                    width: 35,
                    height: 35
                  }}
                />

              </Marker>
            );
          } else {
            console.warn(`Marker ${index} does not have a valid coordinate.`);
          }
        })}
      </MapView>


      <View style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 75,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f8f8', // Lighter background
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: -2, // Negative value to lift the shadow up
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderTopWidth: 1,
        borderTopColor: '#ddd', // Lighter border color
      }}>
        <TouchableOpacity onPress={() => setAddMarker(!addMarker)}>
          <LinearGradient
            colors={['#3498db', '#2980b9']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[
              styles.button,
              {
                width: "31%",
                borderRadius: 25,
                padding: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }
            ]}
          >
            <FontAwesome
              name={addMarker ? "times" : "plus"}
              size={24}
              color="white"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.75)', // Shadow color
                textShadowOffset: { width: -1, height: 1 }, // Shadow offset
                textShadowRadius: 10, // Shadow blur radius
              }}
            />
            <Text style={[styles.buttonText, { color: 'white', marginLeft: 10 }]}>
              {addMarker ? "Annuler" : "Localiser"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>


      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={() => {
          setVisible(!visible);
        }}
      >
        <ScrollView>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Ajouter une annonce</Text>

              <Formik
                initialValues={{
                  type_bien: '',
                  type_operation: '',
                  surface: '',
                  prix_bien: '',
                  description: '',
                }}
                onSubmit={handleSubmit}
                validate={values => {
                  const errors = {};

                  if (!values.type_bien) {
                    errors.type_bien = 'Required';
                  }

                  if (!values.type_operation) {
                    errors.type_operation = 'Required';
                  }

                  if (!values.surface) {
                    errors.surface = 'Required';
                  } else if (isNaN(values.surface)) {
                    errors.surface = 'Must be a number';
                  }

                  if (!values.prix_bien) {
                    errors.prix_bien = 'Required';
                  } else if (isNaN(values.prix_bien)) {
                    errors.prix_bien = 'Must be a number';
                  }

                  // Add more validation as needed

                  return errors;
                }}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, isSubmitting }) => (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Type de bien:</Text>
                      <Field
                        name="type_bien"
                        as={Picker}
                        selectedValue={values.type_bien}
                        onValueChange={handleChange('type_bien')}
                        onBlur={handleBlur('type_bien')}
                        style={styles.input}
                      >
                        <Picker.Item label="Select Type de bien" value="" />
                        <Picker.Item label="MAISON" value="MAISON" color="#0000FF" />
                        <Picker.Item label="VILLA" value="VILLA" color="#008000" />
                        <Picker.Item label="APPARTEMENT" value="APPARTEMENT" color="#FFA500" />
                      </Field>
                      {errors.type_bien &&
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.type_bien}</Text>
                        </View>
                      }
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Type d'opération:</Text>
                      <Field
                        name="type_operation"
                        as={Picker}
                        selectedValue={values.type_operation}
                        onValueChange={handleChange('type_operation')}
                        onBlur={handleBlur('type_operation')}
                        style={styles.input}
                      >
                        <Picker.Item label="Select Type d'opération" value="" />
                        <Picker.Item label="VENDRE" value="VENDRE" color="#0000FF" />
                        <Picker.Item label="LOUER" value="LOUER" color="#008000" />
                      </Field>
                      {errors.type_operation &&
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.type_operation}</Text>
                        </View>
                      }
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Surface:</Text>
                      <Field
                        name="surface"
                        component={FormikTextInput}
                        style={styles.input2}
                        placeholder="Surface_bien"
                        onBlur={handleBlur('surface')}
                      />
                      {errors.surface &&
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.surface}</Text>
                        </View>
                      }
                      <Text style={styles.labelRight}>m²</Text>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Prix:</Text>
                      <Field
                        name="prix_bien"
                        component={FormikTextInput}
                        style={styles.input2}
                        placeholder="Prix"
                        onBlur={handleBlur('prix_bien')}
                      />
                      {errors.prix_bien &&
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.prix_bien}</Text>
                        </View>
                      }
                      <Text style={styles.labelRight}>Dhs</Text>
                    </View>

                    <Field
                      name="description"
                      component={FormikTextInput}
                      style={[styles.inputDescription, { height: 100, width: 300 }]}
                      placeholder="Description"
                      onBlur={handleBlur('description')}
                      multiline
                      numberOfLines={4}
                    />

                    <TouchableOpacity
                      style={styles.button2}
                      onPress={pickDocument}
                    >
                      <Text style={styles.buttonText2}>Ajouter un justificatif</Text>
                    </TouchableOpacity>

                    {documentUri && (
                      <View style={styles.fileContainer}>
                        <Text style={styles.fileName}>
                          Fichier sélectionné: {justificatif_name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setDocumentUri(null);
                            setJustificatif_name("");
                          }}
                        >
                          <FontAwesome name="times" size={24} color="red" />
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.button2}
                      onPress={pickImage}
                    >
                      <Text style={styles.buttonText2}>Choisir une image</Text>
                    </TouchableOpacity>

                    {imageUris && imageUris.map((uri, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image source={{ uri: uri }} style={styles.image} resizeMode="contain" />
                        <TouchableOpacity
                          style={styles.imageDeleteButton}
                          onPress={() => {
                            setImageUris(oldUris => oldUris.filter((_, i) => i !== index));
                          }}
                        >
                          <FontAwesome name="times" size={24} color="red" />
                        </TouchableOpacity>
                      </View>
                    ))}


                    {isSubmitting ? (
                      <ActivityIndicator size="large" style={{ margin: 20 }} />
                    ) : (
                      <View style={styles.twoButtonContainer}>
                        <TouchableOpacity
                          style={{ ...styles.openButton, backgroundColor: "#2196F3" }}
                          onPress={handleSubmit}
                        >
                          <Text style={styles.textStyle}>Ajouter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ ...styles.openButton, backgroundColor: "#f44336" }}
                          onPress={handleCancel}
                        >
                          <Text style={styles.textStyle}>Retourner</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                  </>
                )}
              </Formik>
            </View>
          </View>
        </ScrollView>
      </Modal>


      {selectedMarker && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={selectedMarker != null}
          onRequestClose={() => {
            setSelectedMarker(null);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>

              <TouchableOpacity
                style={{ position: 'absolute', right: 10, top: 10 }}
                onPress={() => setSelectedMarker(null)}
              >
                <FontAwesome name="times" size={24} color="red" />
              </TouchableOpacity>

              <ScrollView style={styles.scrollView}>
                <Text style={styles.bodyText}>Date: {selectedMarker.date_annonce}</Text>
                <Text style={styles.bodyText}>Type de bien: {selectedMarker.type_bien}</Text>
                <Text style={styles.bodyText}>Type d'opération: {selectedMarker.type_operation}</Text>
                <Text style={styles.bodyText}>Surface: {selectedMarker.surface} m²</Text>
                <Text style={styles.bodyText}>Prix: {selectedMarker.prix_bien} Dhs</Text>
                <Text style={styles.bodyText}>Description: {selectedMarker.description}</Text>

                <Text style={styles.bodyText}>Etat: {selectedMarker.etat}</Text>
                <Text style={styles.bodyText}>Statut: {selectedMarker.statut}</Text>
                <Text style={styles.bodyText}>Motif de rejet: {selectedMarker.motif_rejet}</Text>


                {selectedMarker && selectedMarker.justificatif && (
                  <TouchableOpacity
                    style={styles.pdfButton}
                    onPress={() => Linking.openURL(selectedMarker.justificatif)}
                  >
                    <Text style={styles.pdfButtonText}>Open PDF</Text>
                  </TouchableOpacity>
                )}

                {selectedMarker.photo && typeof selectedMarker.photo === 'string' && selectedMarker.photo.split(';').map((url, index) => (
                  <View key={index} style={styles.imageContainer2}>
                    <Image source={{ uri: url }} style={styles.image2} />
                  </View>
                ))}
                {selectedMarker.photo && Array.isArray(selectedMarker.photo) && selectedMarker.photo.map((url, index) => (
                  <View key={index} style={styles.imageContainer2}>
                    <Image source={{ uri: url }} style={styles.image2} />
                  </View>
                ))}


              </ScrollView>
            </View>
          </View>
        </Modal>
      )}


    </Layout>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  map: {
    flex: 1,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  inputDescription: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
    marginVertical: 10,
    width: '100%',
    borderRadius: 5,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10, // Add some bottom margin to all inputs
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 10,
    margin: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonText1: {
    backgroundColor: "#4CAF50",
    borderRadius: 30,
    padding: 15,
    elevation: 5,
    width: 200,
    marginVertical: 10,
    alignSelf: 'center', // Center the buttons
  },
  textStyle1: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  landingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C8E6C9',
  },
  landingText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logo: {
    marginBottom: 20,
  },
  openButton: {
    backgroundColor: "#F194FF",
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    width: 100,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 30,
    alignSelf: 'center', // Center the buttons
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center"
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#4CAF50',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  twoButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    marginRight: 10,
  },
  labelRight: {
    marginLeft: 10,
  },
  input2: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  scrollView: {
    padding: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4CAF50',
  },
  bodyText: {
    fontSize: 16,
    marginBottom: 20,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button3: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    marginBottom: 20
  },
  buttonText3: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    margin: 5,
    padding: 10,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 5,
    alignSelf: 'flex-start', // Align error messages to the start
  },
  errorText: {
    color: '#721c24',
  },

  button2: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    marginTop: 10
  },
  buttonText2: {
    color: 'white',
    textAlign: 'center'
  },
  fileContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5
  },
  fileName: {
    flex: 1,
    fontSize: 16
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  image: {
    width: '100%', // or any desired width
    height: undefined,
    aspectRatio: 1, // change this to the desired aspect ratio
  },
  imageDeleteButton: {
    marginLeft: 10
  },
  pdfButton: {
    backgroundColor: 'yellowgreen',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    marginBottom: 20,
    width: '100%', // Make the button take the full width of the modal
  },
  pdfButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center', // Center the text inside the button
  },
  imageContainer2: {
    width: '100%', // Make the image container take the full width of the modal
    padding: 10,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'white',
    alignSelf: 'center',
  },
  image2: {
    width: '100%',
    height: 200,
    resizeMode: 'contain', // Make the image maintain its aspect ratio
    height: undefined,
    aspectRatio: 1, // change this to the desired aspect ratio
  },
});