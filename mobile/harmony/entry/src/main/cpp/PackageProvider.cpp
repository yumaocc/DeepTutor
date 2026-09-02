#include "RNOH/PackageProvider.h"
#include "AsyncStoragePackage.h"
#include "GestureHandlerPackage.h"
#include "RNCNetInfoPackage.h"
#include "ReanimatedPackage.h"
#include "SafeAreaViewPackage.h"

using namespace rnoh;

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(
    Package::Context ctx) {
  return {
      std::make_shared<AsyncStoragePackage>(ctx),
      std::make_shared<RNCNetInfoPackage>(ctx),
      std::make_shared<GestureHandlerPackage>(ctx),
      std::make_shared<ReanimatedPackage>(ctx),
      std::make_shared<SafeAreaViewPackage>(ctx),
  };
}
