import type {
  ImageLibraryOptions,
  ImagePickerResponse,
} from 'react-native-image-picker';
export async function launchImageLibrary(
  _options: ImageLibraryOptions,
): Promise<ImagePickerResponse> {
  return {
    errorCode: 'others',
    errorMessage: 'Photo picker is not installed on Harmony yet.',
  };
}
