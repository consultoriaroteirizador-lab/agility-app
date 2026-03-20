
import LockIcon from '@/assets/icons/auth/login/lock.svg';
import IconUserIcon from '@/assets/icons/auth/login/user.svg';
import BackArrowIcon from '@/assets/icons/back_arrow_icon.svg';
import CheckRound from '@/assets/icons/check-round.svg';
import CheckIcon from '@/assets/icons/check.svg';
import CircleCloseIcon from '@/assets/icons/circle_close.svg';
import Copy from '@/assets/icons/copy.svg';
import ErrorRound from '@/assets/icons/error-round.svg';
import ForwardArrowIcon from '@/assets/icons/forward_arrow_icon.svg';
import AppleMaps from '@/assets/icons/icon-apple-maps.svg';
import Waze from '@/assets/icons/icon-waze.svg';
import GoogleMaps from '@/assets/icons/icons-google-maps.svg';
import WhatsAppColor from '@/assets/icons/icons8-whatsapp.svg';
import CardHomeConvenio from '@/assets/icons/membership/cardhome.svg';
import MembershipWithdrawal from '@/assets/icons/membership/cash.svg';
import EstablishmentCart from '@/assets/icons/membership/establishment_cart.svg';
import EstablishmentGeneric from '@/assets/icons/membership/establishment_generic.svg';
import EstablishmentPharmacy from '@/assets/icons/membership/establishment_pharmacy.svg';
import Establishments from '@/assets/icons/membership/establishments.svg';
import GasStation from '@/assets/icons/membership/gas-station.svg';
import Location from '@/assets/icons/membership/location.svg';
import MembershipPassword from '@/assets/icons/membership/membership_password.svg';
import Recharge from '@/assets/icons/membership/recharge.svg';
import ShoppingCart from '@/assets/icons/membership/shopping-cart.svg';
import Statements from '@/assets/icons/membership/statements.svg';
import IconHome from '@/assets/icons/menu/icon_home.svg';
import Eye from '@/assets/icons/password_visibility.svg';
import EyeOff from '@/assets/icons/password_visibility_off.svg';
import ShoppingGeneric from '@/assets/icons/shopping//shopping.svg';
import FoodCategoryShopping from '@/assets/icons/shopping/food_category_icon.svg';
import GameCategoryShopping from '@/assets/icons/shopping/games_category_icon.svg';
import LoteriaCategoryShopping from '@/assets/icons/shopping/loteria_category.svg';
import SoftwareCategoryShopping from '@/assets/icons/shopping/software-program-icon.svg';
import StoreCategoryShopping from '@/assets/icons/shopping/stores_category_icon.svg';
import StreamingCategoryShopping from '@/assets/icons/shopping/streaming_category_icon.svg';
import TransportCategoryShopping from '@/assets/icons/shopping/transport_category_icon.svg';
import PhoneIcon from '@/assets/icons/telecom/phone.svg';
import WhatsApp from '@/assets/icons/whatsappicon.svg';
import SuccessDefault from '@/assets/successScreen/success_default.svg';
import { useAppTheme } from '@/hooks';
import { measure, ThemeColors } from '@/theme';



export interface LocalIconProps {
  size?: number;
  color?: ThemeColors;
  iconName: LocalIconName;
}

export function LocalIcon({ iconName, color = "primary100", size = measure.m12 }: LocalIconProps) {
  const colors = useAppTheme().colors;
  const SVGIcon = iconRegistry[iconName];
  if (!SVGIcon) return null;
  return <SVGIcon color={colors[color!]} width={size!} height={size!} />;
}

const iconRegistry = {
  iconUser: IconUserIcon,
  backArrow: BackArrowIcon,
  forwardArrow: ForwardArrowIcon,
  lock: LockIcon,
  check: CheckIcon,
  circleClose: CircleCloseIcon,

  checkRound: CheckRound,
  errorRound: ErrorRound,

  eye: Eye,
  eyeOff: EyeOff,

  iconHome: IconHome,

  membershipWithdrawal: MembershipWithdrawal,

  establishments: Establishments,
  statements: Statements,
  membershipPassword: MembershipPassword,
  recharge: Recharge,
  establishmentCart: EstablishmentCart,

  establishmentGeneric: EstablishmentGeneric,
  establishmentPharmacy: EstablishmentPharmacy,
  establishmentGasStation: GasStation,
  establishmentShoppingCart: ShoppingCart,
  location: Location,
  waze: Waze,
  googleMaps: GoogleMaps,
  appleMaps: AppleMaps,
  successDefault: SuccessDefault,

  foodCategoryShopping: FoodCategoryShopping,
  gameCategoryShopping: GameCategoryShopping,
  storeCategoryShopping: StoreCategoryShopping,
  streamingCategoryShopping: StreamingCategoryShopping,
  transportCategoryShopping: TransportCategoryShopping,
  shoppingGeneric: ShoppingGeneric,
  loteriaCategoryShopping: LoteriaCategoryShopping,
  softwareCategoryShopping: SoftwareCategoryShopping,

  copy: Copy,

  whatsApp: WhatsApp,
  whatsAppColor: WhatsAppColor,

  cardHomeConvenio: CardHomeConvenio,

  chat: WhatsApp,
  phone: PhoneIcon,
  box: EstablishmentCart,
};

export type IconType = typeof iconRegistry;
export type LocalIconName = keyof IconType;
